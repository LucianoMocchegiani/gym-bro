import { BadRequestException, Inject, Injectable, Logger, forwardRef, NotFoundException } from '@nestjs/common';
import { PaymentMethod, SessionStatus, ReservationStatus, ReservationCoverage } from '@prisma/client';
import { TransactionService, TransactionItemInput } from './transaction.service';
import { PaymentRegisterService } from '../payment-register/register.service';
import { CashMovementConcept, ReceiptConcept } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ReceiptsService } from '../receipts/receipts.service';
import type { ReceiptDetail } from '../receipts/receipts.types';
import { SessionValidationService } from '../sessions/session-validation.service';
import { ContractsService } from '../contracts/contracts.service';
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
 * Procesa pagos (CASH o STUB).
 *
 * @description
 * - Crea Transaction + TransactionItems (APPROVED para CASH/STUB)
 * - Si CASH: registra movimiento en caja y emite un comprobante por Transaction
 * - Si STUB: solo crea Transaction (sin movimiento de caja, para créditos manuales)
 *
 * @remarks
 * El caller debe wrapear la llamada en $transaction si necesita atomicidad
 * con otras operaciones (ej: crear Contract después del pago).
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
   * - Incrementa bookedCount para cada sesión
   * - Crea Transaction APPROVED con todos los items
   * - Un receipt por el total del cart
   * - Crea contratos para PACK y reservas para DROP_IN
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
      const qty = item.quantity ?? 1;
      sessions.push({
        sessionId: session.id,
        amount: session.service.dropInPrice!,
        name: session.service.name,
        quantity: qty,
      });
    }

    for (const item of packItems) {
      const pack = await this.prisma.pack.findFirst({
        where: { id: item.id, tenantId, active: true },
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

    const result = await this.prisma.$transaction(async (tx) => {
      for (const s of sessions) {
        for (let q = 0; q < s.quantity; q++) {
          const fresh = await tx.session.findFirst({
            where: { id: s.sessionId, tenantId, status: SessionStatus.PUBLISHED },
            select: { id: true, bookedCount: true, capacity: true },
          });
          if (!fresh || fresh.bookedCount >= fresh.capacity) {
            throw new BadRequestException(
              `Session ${s.sessionId} is full or not available`,
            );
          }
          const updated = await tx.session.updateMany({
            where: { id: fresh.id, tenantId, bookedCount: fresh.bookedCount },
            data: { bookedCount: { increment: 1 } },
          });
          if (updated.count !== 1) {
            throw new BadRequestException(
              `Session ${s.sessionId} capacity changed concurrently`,
            );
          }
        }
      }

      const allItems: TransactionItemInput[] = [];
      let idx = 0;
      for (const s of sessions) {
        for (let q = 0; q < s.quantity; q++) {
          allItems.push({
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

      const totalItems = sessions.reduce((sum, s) => sum + s.quantity, 0) +
        packs.reduce((sum, p) => sum + p.quantity, 0);
      const totalAmount = sessions.reduce((sum, s) => sum + s.amount * s.quantity, 0) +
        packs.reduce((sum, p) => sum + p.amount * p.quantity, 0);
      const label = totalItems === 1
        ? (sessions[0]?.name ?? packs[0]?.name ?? 'Cart')
        : `${totalItems} items`;

      const { transaction } = await this.processPayment(tx, {
        tenantId,
        memberId,
        items: allItems,
        idempotencyKey,
        method: PaymentMethod.CASH,
        cashConcept: CashMovementConcept.DROP_IN,
        receiptConcept: ReceiptConcept.DROP_IN,
        description: label,
        recordedByStaffId: actor.profileType === 'STAFF' ? actor.userId : null,
      });

      for (const s of sessions) {
        for (let q = 0; q < s.quantity; q++) {
          const txItem = transaction.transactionItems.find(
            (ti) => ti.sessionId === s.sessionId && ti.status === 'APPROVED',
          );
          if (!txItem) continue;
          await tx.reservation.create({
            data: {
              tenantId,
              memberId,
              sessionId: s.sessionId,
              transactionItemId: txItem.id,
              status: ReservationStatus.CONFIRMED,
              coverage: ReservationCoverage.DROP_IN,
            },
          });
        }
      }

      for (const p of packs) {
        for (let q = 0; q < p.quantity; q++) {
          const txItem = transaction.transactionItems.find(
            (ti) => ti.packId === p.packId && ti.status === 'APPROVED',
          );
          if (!txItem) continue;
          await this.contracts.createFromTransactionItem(
            tenantId,
            txItem.id,
            actor,
          );
        }
      }

      return { transaction };
    });

    let receipt: ReceiptDetail | null = null;
    try {
      receipt = await this.receiptsService.findByTransactionId(
        tenantId,
        result.transaction.id,
      );
    } catch {
      this.logger.warn(
        `CASH cart ${result.transaction.id} committed without receipt`,
      );
    }

    return {
      transactionId: result.transaction.id,
      amount: result.transaction.amount,
      status: result.transaction.status,
      transactionItems: result.transaction.transactionItems.map((item) => ({
        id: item.id,
        sessionId: item.sessionId,
        packId: item.packId,
        amount: item.amount,
      })),
      receipt,
    };
  }
}
