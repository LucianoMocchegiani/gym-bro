import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  forwardRef,
  NotFoundException,
} from '@nestjs/common';
import { PaymentMethod } from '@prisma/client';
import {
  TransactionService,
  TransactionItemInput,
} from './transaction.service';
import { PaymentRegisterService } from '../payment-register/register.service';
import { CashMovementConcept, ReceiptConcept } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ReceiptsService } from '../receipts/receipts.service';
import type { ReceiptDetail } from '../receipts/receipts.types';
import { SessionValidationService } from '../sessions/session-validation.service';
import { ContractsService } from '../contracts/contracts.service';
import { PacksService } from '../packs/packs.service';
import { PlatformTrialService } from '../tenants/platform-trial.service';
import { ReservationsService } from '../reservations/reservations.service';
import { NotificationDispatcher } from '../notifications/notifications.service';
import { AuditActor } from '../audit/audit.types';
import { CreateCashCartDto } from './dto/create-cash-cart.dto';
import { CashCartResult } from './payment.types';
import { Prisma } from '@prisma/client';

type Tx = Prisma.TransactionClient;

export interface ProcessPaymentParams {
  /** Tenant que abona: el dueño del cobro o el gym facturado por la plataforma. */
  tenantId: string;
  /** Afiliado cobrador. Null cuando el tenant mismo abona. */
  memberId: string | null;
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
    private readonly platformTrial: PlatformTrialService,
    private readonly notifications: NotificationDispatcher,
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
  ): Promise<{
    transaction: Awaited<ReturnType<TransactionService['initiateTransaction']>>;
  }> {
    const {
      tenantId,
      memberId,
      items,
      idempotencyKey,
      method,
      cashConcept,
      receiptConcept,
      description,
      recordedByStaffId,
    } = params;

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
      const billedItems = confirmed.transactionItems.filter(
        (item) => item.amount >= 1,
      );
      for (const item of billedItems) {
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

      const total = billedItems.reduce((sum, item) => sum + item.amount, 0);
      if (total >= 1) {
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
    if (dto.applyTrial) {
      throw new BadRequestException(
        'Platform trial is only available on platform Caja',
      );
    }
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
      sessions.length > 0
        ? ReceiptConcept.DROP_IN
        : ReceiptConcept.PACK_CONTRACT;

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
      this.logger.warn(`CASH cart ${transaction.id} committed without receipt`);
    }

    await this.notifications.notifyPaymentApproved(tenantId, transaction.id);

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

  /**
   * Checkout en efectivo de la Caja de plataforma: el tenant `admin` le factura
   * un pack propio a otro gym.
   *
   * @description
   * Reusa {@link processPayment} con `memberId: null`: el pagador es el propio
   * `tenantId` de la transacción (`billingTenantId`). Crea contrato `TENANT`.
   * `applyTrial`: 30 días, $0, candados por gym y por cuenta dueña.
   *
   * @remarks
   * `catalogTenantId` es el tenant dueño del pack (la plataforma); la
   * transacción se emite contra `billingTenantId` (el gym que paga).
   * Solo packs: el drop-in es por sesiones de un gym, no aplica a plataforma.
   */
  async startTenantCashCart(
    catalogTenantId: string,
    billingTenantId: string,
    actor: AuditActor,
    dto: CreateCashCartDto,
  ): Promise<CashCartResult> {
    if (dto.applyTrial) {
      if (dto.items.length !== 1 || (dto.items[0]?.quantity ?? 1) !== 1) {
        throw new BadRequestException(
          'Platform trial requires a single pack in the cart',
        );
      }
      await this.platformTrial.assertCanApplyTrial(billingTenantId);
    }

    const idempotencyKey =
      dto.idempotencyKey?.trim() || `tenant-cash-cart-${Date.now()}`;

    if (dto.items.length === 0) {
      throw new BadRequestException('Cart must have at least one item');
    }
    if (dto.items.some((i) => i.kind !== 'PACK')) {
      throw new BadRequestException('Platform sales only support PACK items');
    }

    const target = await this.prisma.tenant.findUnique({
      where: { id: billingTenantId },
      select: { id: true, name: true, slug: true, status: true },
    });
    if (!target) {
      throw new NotFoundException(`Tenant ${billingTenantId} not found`);
    }
    if (target.id === catalogTenantId) {
      throw new BadRequestException('A tenant cannot be billed for itself');
    }

    const packs: Array<{
      packId: string;
      amount: number;
      name: string;
      quantity: number;
    }> = [];

    for (const item of dto.items) {
      const pack = await this.prisma.pack.findFirst({
        where: {
          id: item.id,
          tenantId: catalogTenantId,
          active: true,
          originServiceId: null,
        },
        select: { id: true, name: true, price: true, components: true },
      });
      if (!pack) {
        throw new NotFoundException(`Pack ${item.id} not found or inactive`);
      }
      if (pack.components.length === 0) {
        throw new BadRequestException(`Pack ${pack.name} has no components`);
      }
      if (!dto.applyTrial && pack.price < 1) {
        throw new BadRequestException('Pack price must be at least 1');
      }
      packs.push({
        packId: pack.id,
        amount: dto.applyTrial ? 0 : pack.price,
        name: pack.name,
        quantity: item.quantity ?? 1,
      });
    }

    const allItems: TransactionItemInput[] = [];
    let idx = 0;
    for (const p of packs) {
      for (let q = 0; q < p.quantity; q++) {
        allItems.push({
          packId: p.packId,
          amount: p.amount,
          idempotencyKey: `${idempotencyKey}-${idx++}`,
        });
      }
    }

    const totalItems = packs.reduce((sum, p) => sum + p.quantity, 0);
    const label = dto.applyTrial
      ? `Prueba Faciliter 30 días — ${target.name}`
      : totalItems === 1
        ? `${packs[0]?.name ?? 'Cart'} — ${target.name}`
        : `${totalItems} items — ${target.name}`;

    const { transaction } = await this.prisma.$transaction(async (tx) => {
      return this.processPayment(tx, {
        tenantId: billingTenantId,
        memberId: null,
        items: allItems,
        idempotencyKey,
        method: PaymentMethod.CASH,
        cashConcept: CashMovementConcept.PACK_CONTRACT,
        receiptConcept: ReceiptConcept.PACK_CONTRACT,
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
      await this.contracts.createFromTransactionItem(
        billingTenantId,
        item.id,
        actor,
        { applyTrial: Boolean(dto.applyTrial) },
      );
    }

    let receipt: ReceiptDetail | null = null;
    try {
      receipt = await this.receiptsService.findByTransactionId(
        billingTenantId,
        transaction.id,
      );
    } catch {
      this.logger.warn(
        `platform CASH cart ${transaction.id} committed without receipt`,
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
