import { BadRequestException, Inject, Injectable, Logger, forwardRef, NotFoundException } from '@nestjs/common';
import { PaymentMethod } from '@prisma/client';
import { TransactionService, TransactionItemInput } from './transaction.service';
import { PaymentRegisterService } from '../payment-register/register.service';
import { CashMovementConcept, ReceiptConcept } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ReceiptsService } from '../receipts/receipts.service';
import type { ReceiptDetail } from '../receipts/receipts.types';
import { SessionValidationService } from '../sessions/session-validation.service';
import { ContractsService } from '../contracts/contracts.service';
import { PacksService } from '../packs/packs.service';
import { ReservationsService } from '../reservations/reservations.service';
import { AuditActor } from '../audit/audit.types';
import { CreateCashCartDto } from './dto/create-cash-cart.dto';
import { CashCartResult } from './payment.types';
import { Prisma } from '@prisma/client';

type Tx = Prisma.TransactionClient;

export interface ProcessPaymentParams {
  tenantId: string;
  memberId: string;
  items: TransactionItemInput[];
  idempotencyKey: string;
  method: PaymentMethod;
  cashConcept: CashMovementConcept;
  receiptConcept: ReceiptConcept;
  description: string;
  recordedByStaffId?: string | null;
}

/**
 * Procesa pagos CASH (caja).
 *
 * @description
 * - Crea Transaction + TransactionItems APPROVED
 * - Registra movimiento en caja y emite un comprobante por Transaction
 *
 * @remarks
 * `STUB` se rechaza. El caller debe wrapear en $transaction si necesita
 * atomicidad con otras operaciones.
 */
@Injectable()
export class CashPaymentService {
  private readonly logger = new Logger(CashPaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly transactionService: TransactionService,
    private readonly registerService: PaymentRegisterService,
    private readonly receiptsService: ReceiptsService,
    private readonly sessionValidation: SessionValidationService,
    @Inject(forwardRef(() => ContractsService))
    private readonly contracts: ContractsService,
    @Inject(forwardRef(() => ReservationsService))
    private readonly reservations: ReservationsService,
    private readonly packs: PacksService,
  ) {}

  /**
   * Procesa un pago.
   *
   * @param tx - Transacción Prisma existente (para atomicidad con otras operaciones)
   * @param params - Parámetros del pago
   * @returns La Transaction confirmada con sus items
   */
  async processPayment(
    tx: Tx,
    params: ProcessPaymentParams,
  ): Promise<{ transaction: Awaited<ReturnType<TransactionService['initiateTransaction']>> }> {
    const { tenantId, memberId, items, idempotencyKey, method, cashConcept, receiptConcept, description, recordedByStaffId } = params;

    if (method === PaymentMethod.STUB) {
      throw new BadRequestException(
        'STUB payments are disabled. Use Caja (efectivo) or Mercado Pago.',
      );
    }

    const transaction = await this.transactionService.initiateTransaction({
      tenantId,
      memberId,
      method,
      items,
      recordedByStaffId: recordedByStaffId ?? null,
    });

    const confirmed = await this.transactionService.confirmTransaction(
      transaction.id,
      { userId: recordedByStaffId ?? 'system', profileType: 'SYSTEM' },
    );

    if (method === PaymentMethod.CASH) {
      for (const item of confirmed.transactionItems) {
        await this.registerService.recordIncome(tx, {
          tenantId,
          transactionItemId: item.id,
          memberId,
          amount: item.amount,
          method: PaymentMethod.CASH,
          concept: cashConcept,
          recordedByStaffId: recordedByStaffId ?? null,
        });
      }

      const total = confirmed.transactionItems.reduce((sum, item) => sum + item.amount, 0);
      await this.receiptsService.issueForApprovedPayment(tx, {
        tenantId,
        transactionId: confirmed.id,
        memberId,
        amount: total,
        method: PaymentMethod.CASH,
        concept: receiptConcept,
        description,
      });
    }

    return { transaction: confirmed };
  }

  /**
   * Checkout en efectivo de carrito: múltiples items (DROP_IN y PACK) en una sola transacción.
   *
   * @description
   * - Valida sesiones (DROP_IN) y packs antes de procesar
   * - Crea Transaction APPROVED, contratos (pack o drop-in ONE_TIME) y reservas CREDIT
   *
   * @returns Cart APPROVED con `receipt` leído **después** del commit (el
   *   lookup no puede ir dentro de `$transaction`: `findByTransactionId` usa
   *   otra conexión y no vería el comprobante aún no commiteado).
   */
  async startCashCart(
    tenantId: string,
    memberId: string,
    actor: AuditActor,
    dto: CreateCashCartDto,
  ): Promise<CashCartResult> {
    const idempotencyKey =
      dto.idempotencyKey?.trim() || `cash-cart-${Date.now()}`;

    if (dto.items.length === 0) {
      throw new BadRequestException('Cart must have at least one item');
    }

    const dropInItems = dto.items.filter((i) => i.kind === 'DROP_IN');
    const packItems = dto.items.filter((i) => i.kind === 'PACK');

    const sessions: Array<{
      sessionId: string;
      packId: string;
      amount: number;
      name: string;
      quantity: number;
    }> = [];
    const packs: Array<{
      packId: string;
      amount: number;
      name: string;
      quantity: number;
    }> = [];

    for (const item of dropInItems) {
      const session = await this.sessionValidation.validateSessionForDropIn(
        tenantId,
        memberId,
        item.id,
      );
      const dropInPack = await this.packs.ensureDropInPack(
        tenantId,
        session.serviceId,
        { requireEnabled: true },
      );
      if (!dropInPack) {
        throw new BadRequestException(
          'Drop-in is not enabled for this service (set dropInPrice)',
        );
      }
      const qty = item.quantity ?? 1;
      sessions.push({
        sessionId: session.id,
        packId: dropInPack.id,
        amount: dropInPack.price,
        name: session.service.name,
        quantity: qty,
      });
    }

    for (const item of packItems) {
      const pack = await this.prisma.pack.findFirst({
        where: { id: item.id, tenantId, active: true, originServiceId: null },
        select: { id: true, name: true, price: true, components: true },
      });
      if (!pack) {
        throw new NotFoundException(`Pack ${item.id} not found or inactive`);
      }
      if (pack.components.length === 0) {
        throw new BadRequestException(`Pack ${pack.name} has no components`);
      }
      if (pack.price < 1) {
        throw new BadRequestException('Pack price must be at least 1');
      }
      packs.push({
        packId: pack.id,
        amount: pack.price,
        name: pack.name,
        quantity: item.quantity ?? 1,
      });
    }

    const allItems: TransactionItemInput[] = [];
    let idx = 0;
    for (const s of sessions) {
      for (let q = 0; q < s.quantity; q++) {
        allItems.push({
          packId: s.packId,
          sessionId: s.sessionId,
          amount: s.amount,
          idempotencyKey: `${idempotencyKey}-${idx++}`,
        });
      }
    }
    for (const p of packs) {
      for (let q = 0; q < p.quantity; q++) {
        allItems.push({
          packId: p.packId,
          amount: p.amount,
          idempotencyKey: `${idempotencyKey}-${idx++}`,
        });
      }
    }

    const totalItems =
      sessions.reduce((sum, s) => sum + s.quantity, 0) +
      packs.reduce((sum, p) => sum + p.quantity, 0);
    const label =
      totalItems === 1
        ? (sessions[0]?.name ?? packs[0]?.name ?? 'Cart')
        : `${totalItems} items`;
    const cashConcept =
      sessions.length > 0
        ? CashMovementConcept.DROP_IN
        : CashMovementConcept.PACK_CONTRACT;
    const receiptConcept =
      sessions.length > 0 ? ReceiptConcept.DROP_IN : ReceiptConcept.PACK_CONTRACT;

    const { transaction } = await this.prisma.$transaction(async (tx) => {
      return this.processPayment(tx, {
        tenantId,
        memberId,
        items: allItems,
        idempotencyKey,
        method: PaymentMethod.CASH,
        cashConcept,
        receiptConcept,
        description: label,
        recordedByStaffId: actor.profileType === 'STAFF' ? actor.userId : null,
      });
    });

    const usedItemIds = new Set<string>();
    for (const item of transaction.transactionItems) {
      if (item.status !== 'APPROVED' || !item.packId) {
        continue;
      }
      if (usedItemIds.has(item.id)) {
        continue;
      }
      usedItemIds.add(item.id);
      const contract = await this.contracts.createFromTransactionItem(
        tenantId,
        item.id,
        actor,
      );
      if (item.sessionId) {
        await this.reservations.createForMember(
          tenantId,
          memberId,
          { sessionId: item.sessionId, contractId: contract.id },
          actor,
        );
      }
    }

    let receipt: ReceiptDetail | null = null;
    try {
      receipt = await this.receiptsService.findByTransactionId(
        tenantId,
        transaction.id,
      );
    } catch {
      this.logger.warn(
        `CASH cart ${transaction.id} committed without receipt`,
      );
    }

    return {
      transactionId: transaction.id,
      amount: transaction.amount,
      status: transaction.status,
      transactionItems: transaction.transactionItems.map((item) => ({
        id: item.id,
        sessionId: item.sessionId,
        packId: item.packId,
        amount: item.amount,
      })),
      receipt,
    };
  }
}
