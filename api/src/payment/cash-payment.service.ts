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
import { AUDIT_ACTIONS, AuditActor } from '../audit/audit.types';
import { AuditService } from '../audit/audit.service';
import { TenantSettingsService } from '../tenant-settings/tenant-settings.service';
import {
  MAX_DISCOUNT_BPS,
  applyDiscount,
  bpsToPercent,
  percentToBps,
} from './cash-discount';
import { CreateCashCartDto } from './dto/create-cash-cart.dto';
import { CashCartResult } from './payment.types';
import { Prisma } from '@prisma/client';
import { CashProduct, createCashProductItems } from './cash-product-items';

type Tx = Prisma.TransactionClient;

export interface ProcessPaymentParams {
  tenantId: string;
  memberId: string | null;
  billedTenantId?: string | null;
  items: TransactionItemInput[];
  idempotencyKey: string;
  method: PaymentMethod;
  cashConcept: CashMovementConcept;
  receiptConcept: ReceiptConcept;
  description: string;
  recordedByStaffId?: string | null;
  transferReference?: string | null;
}

type CounterCharge = {
  method: 'CASH' | 'TRANSFER';
  discountBps: number;
  transferReference: string | null;
};

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
    private readonly tenantSettings: TenantSettingsService,
    private readonly audit: AuditService,
  ) {}

  async processPayment(
    tx: Tx,
    params: ProcessPaymentParams,
  ): Promise<{
    transaction: Awaited<ReturnType<TransactionService['initiateTransaction']>>;
  }> {
    const {
      tenantId,
      memberId,
      billedTenantId,
      items,
      method,
      cashConcept,
      receiptConcept,
      description,
      recordedByStaffId,
      transferReference,
    } = params;

    if (method === PaymentMethod.STUB) {
      throw new BadRequestException(
        'STUB payments are disabled. Use Caja (efectivo) or Mercado Pago.',
      );
    }

    const transaction = await this.transactionService.initiateTransaction(
      {
        tenantId,
        memberId,
        billedTenantId: billedTenantId ?? null,
        method,
        items,
        recordedByStaffId: recordedByStaffId ?? null,
        transferReference: transferReference ?? null,
      },
      tx,
    );

    const confirmed = await this.transactionService.confirmTransaction(
      transaction.id,
      { userId: recordedByStaffId ?? 'system', profileType: 'SYSTEM' },
      tx,
    );

    if (method === PaymentMethod.CASH || method === PaymentMethod.TRANSFER) {
      const billedItems = confirmed.transactionItems.filter(
        (item) => item.amount >= 1,
      );
      for (const item of billedItems) {
        await this.registerService.recordIncome(tx, {
          tenantId,
          transactionItemId: item.id,
          memberId,
          amount: item.amount,
          method,
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
          method,
          concept: receiptConcept,
          description,
        });
      }
    }

    return { transaction: confirmed };
  }

  private resolveCounterCharge(dto: CreateCashCartDto): CounterCharge {
    const method = dto.method ?? 'CASH';
    const reference = dto.transferReference?.trim() || null;
    if (reference && method !== 'TRANSFER') {
      throw new BadRequestException(
        'transferReference is only allowed with TRANSFER',
      );
    }
    if (dto.applyTrial && dto.discountPercent) {
      throw new BadRequestException('Platform trial cannot have a discount');
    }
    const discountBps =
      dto.discountPercent === undefined ? 0 : percentToBps(dto.discountPercent);
    if (discountBps < 0 || discountBps > MAX_DISCOUNT_BPS) {
      throw new BadRequestException('discountPercent must be between 0 and 99');
    }
    return { method, discountBps, transferReference: reference };
  }

  private discountItems(
    items: TransactionItemInput[],
    discountBps: number,
  ): TransactionItemInput[] {
    if (discountBps === 0) {
      return items;
    }
    return items.map((item) => {
      const amount = applyDiscount(item.amount, discountBps);
      return amount === item.amount
        ? item
        : { ...item, amount, listAmount: item.amount, discountBps };
    });
  }

  private async auditDiscountOverride(
    tenantId: string,
    actor: AuditActor,
    transactionId: string,
    charge: CounterCharge,
    amounts: { list: number; charged: number },
  ): Promise<void> {
    const defaults =
      await this.tenantSettings.getCashDiscountDefaults(tenantId);
    const defaultBps =
      charge.method === 'TRANSFER' ? defaults.transferBps : defaults.cashBps;
    if (charge.discountBps === defaultBps) {
      return;
    }
    await this.audit.record({
      tenantId,
      actor,
      action: AUDIT_ACTIONS.paymentDiscountOverride,
      entityType: 'transaction',
      entityId: transactionId,
      before: {
        method: charge.method,
        defaultDiscountPercent: bpsToPercent(defaultBps),
      },
      after: {
        method: charge.method,
        discountPercent: bpsToPercent(charge.discountBps),
        listAmount: amounts.list,
        chargedAmount: amounts.charged,
      },
    });
  }

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
    const charge = this.resolveCounterCharge(dto);
    const idempotencyKey =
      dto.idempotencyKey?.trim() || `cash-cart-${Date.now()}`;

    if (dto.items.length === 0) {
      throw new BadRequestException('Cart must have at least one item');
    }

    const dropInItems = dto.items.filter((i) => i.kind === 'DROP_IN');
    const packItems = dto.items.filter((i) => i.kind === 'PACK');
    const productItems = dto.items.filter((i) => i.kind === 'PRODUCT');
    const productCatalog: CashProduct[] = [];
    for (const item of productItems) {
      const [product] = await this.prisma.$queryRaw<CashProduct[]>`
        SELECT id, name, price, active FROM products
        WHERE id = ${item.id}::uuid AND tenant_id = ${tenantId}::uuid`;
      if (product) productCatalog.push(product);
    }

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

    const listItems: TransactionItemInput[] = [];
    let idx = 0;
    for (const s of sessions) {
      for (let q = 0; q < s.quantity; q++) {
        listItems.push({
          packId: s.packId,
          sessionId: s.sessionId,
          amount: s.amount,
          idempotencyKey: `${idempotencyKey}-${idx++}`,
        });
      }
    }
    for (const p of packs) {
      for (let q = 0; q < p.quantity; q++) {
        listItems.push({
          packId: p.packId,
          amount: p.amount,
          idempotencyKey: `${idempotencyKey}-${idx++}`,
        });
      }
    }
    const productCart = createCashProductItems(
      productItems,
      productCatalog,
      idempotencyKey,
      idx,
    );
    listItems.push(...productCart.items);
    const allItems = this.discountItems(listItems, charge.discountBps);

    const totalItems =
      sessions.reduce((sum, s) => sum + s.quantity, 0) +
      packs.reduce((sum, p) => sum + p.quantity, 0) +
      productCart.quantity;
    const label =
      totalItems === 1
        ? (sessions[0]?.name ??
          packs[0]?.name ??
          productCart.names[0] ??
          'Cart')
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
        method: charge.method,
        cashConcept,
        receiptConcept,
        description: label,
        recordedByStaffId: actor.profileType === 'STAFF' ? actor.userId : null,
        transferReference: charge.transferReference,
      });
    });
    await this.auditDiscountOverride(tenantId, actor, transaction.id, charge, {
      list: listItems.reduce((sum, item) => sum + item.amount, 0),
      charged: transaction.amount,
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
    const charge = this.resolveCounterCharge(dto);

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
        select: {
          id: true,
          name: true,
          price: true,
          offersPlatformTrial: true,
          components: true,
        },
      });
      if (!pack) {
        throw new NotFoundException(`Pack ${item.id} not found or inactive`);
      }
      if (pack.components.length === 0) {
        throw new BadRequestException(`Pack ${pack.name} has no components`);
      }
      if (dto.applyTrial && !pack.offersPlatformTrial) {
        throw new BadRequestException(
          `Pack ${pack.name} does not offer the platform trial`,
        );
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

    const listItems: TransactionItemInput[] = [];
    let idx = 0;
    for (const p of packs) {
      for (let q = 0; q < p.quantity; q++) {
        listItems.push({
          packId: p.packId,
          amount: p.amount,
          idempotencyKey: `${idempotencyKey}-${idx++}`,
        });
      }
    }
    const allItems = this.discountItems(listItems, charge.discountBps);

    const totalItems = packs.reduce((sum, p) => sum + p.quantity, 0);
    const label = dto.applyTrial
      ? `Prueba Faciliter 30 días — ${target.name}`
      : totalItems === 1
        ? `${packs[0]?.name ?? 'Cart'} — ${target.name}`
        : `${totalItems} items — ${target.name}`;

    const { transaction } = await this.prisma.$transaction(async (tx) => {
      return this.processPayment(tx, {
        tenantId: catalogTenantId,
        memberId: null,
        billedTenantId: billingTenantId,
        items: allItems,
        idempotencyKey,
        method: charge.method,
        cashConcept: CashMovementConcept.PACK_CONTRACT,
        receiptConcept: ReceiptConcept.PACK_CONTRACT,
        description: label,
        recordedByStaffId: actor.profileType === 'STAFF' ? actor.userId : null,
        transferReference: charge.transferReference,
      });
    });
    if (!dto.applyTrial) {
      await this.auditDiscountOverride(
        catalogTenantId,
        actor,
        transaction.id,
        charge,
        {
          list: listItems.reduce((sum, item) => sum + item.amount, 0),
          charged: transaction.amount,
        },
      );
    }

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
        catalogTenantId,
        item.id,
        actor,
        { applyTrial: Boolean(dto.applyTrial) },
      );
    }

    let receipt: ReceiptDetail | null = null;
    try {
      receipt = await this.receiptsService.findByTransactionId(
        catalogTenantId,
        transaction.id,
      );
    } catch {
      this.logger.warn(
        `platform CASH cart ${transaction.id} committed without receipt`,
      );
    }

    await this.notifications.notifyPaymentApproved(
      catalogTenantId,
      transaction.id,
    );

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
