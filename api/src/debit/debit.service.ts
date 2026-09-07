import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BillingPeriod,
  ContractStatus,
  DebitMandate,
  DebitMandateStatus,
  MemberStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { AUDIT_ACTIONS, AuditActor } from '../audit/audit.types';
import { AuditService } from '../audit/audit.service';
import {
  ListResult,
  normalizeListQuery,
  toListResult,
} from '../common/list';
import { mpCopyForPack } from '../payment/mp-item-copy';
import { MercadoPagoAccountService } from '../payment/mercadopago-account.service';
import { MP_ACCOUNT_PORT, MpAccountPort } from '../payment/mp-account.port';
import { WebhookPaymentService } from '../payment/webhook-payment.service';
import { PrismaService } from '../prisma/prisma.service';
import { EnrollDebitMandateDto } from './dto/enroll-debit-mandate.dto';
import { ListDebitMandatesDto } from './dto/list-debit-mandates.dto';
import {
  DebitEnrollResult,
  DebitMandateDetail,
  MemberDebitView,
} from './debit.types';

const TZ = 'America/Argentina/Buenos_Aires';
const OPEN_STATUSES: DebitMandateStatus[] = [
  DebitMandateStatus.ACTIVE,
  DebitMandateStatus.RETRYING,
  DebitMandateStatus.FAILED,
];

type MandateRow = DebitMandate & {
  member: { name: string | null; email: string };
  pack: { name: string; price: number };
};

/**
 * Mandatos de débito MONTHLY (tarjeta guardada + job GymBro).
 *
 * @remarks RN-PAG-013..016 / CU-PAG-008..010. Tenant siempre del JWT.
 */
@Injectable()
export class DebitService {
  private readonly logger = new Logger(DebitService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly accounts: MercadoPagoAccountService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
    private readonly webhook: WebhookPaymentService,
    @Inject(MP_ACCOUNT_PORT) private readonly mp: MpAccountPort,
  ) {}

  /**
   * Cola operativa de Caja.
   */
  async list(
    tenantId: string,
    query: ListDebitMandatesDto,
  ): Promise<ListResult<DebitMandateDetail>> {
    const { skip, take, page, pageSize } = normalizeListQuery(query);
    const today = this.businessDate(new Date());
    const where: Prisma.DebitMandateWhereInput = { tenantId };
    if (query.memberId) {
      where.memberId = query.memberId;
    }
    const bucket = query.bucket ?? 'all';
    if (bucket === 'due') {
      where.status = {
        in: [DebitMandateStatus.ACTIVE, DebitMandateStatus.RETRYING],
      };
      where.nextChargeOn = { lte: today };
    } else if (bucket === 'retrying') {
      where.status = DebitMandateStatus.RETRYING;
    } else if (bucket === 'failed') {
      where.status = DebitMandateStatus.FAILED;
    } else {
      where.status = { in: OPEN_STATUSES };
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.debitMandate.findMany({
        where,
        include: {
          member: { select: { name: true, email: true } },
          pack: { select: { name: true, price: true } },
        },
        orderBy: [{ nextChargeOn: 'asc' }, { createdAt: 'desc' }],
        skip,
        take,
      }),
      this.prisma.debitMandate.count({ where }),
    ]);
    return toListResult(rows.map((r) => this.toDetail(r)), total, page, pageSize);
  }

  /**
   * Mandato abierto del afiliado + MONTHLY vigente (autorizar sin cobro).
   */
  async getMemberView(
    tenantId: string,
    memberId: string,
  ): Promise<MemberDebitView> {
    await this.requireActiveMember(tenantId, memberId);
    const mandate = await this.findOpen(tenantId, memberId);
    const contract = await this.prisma.contract.findFirst({
      where: {
        tenantId,
        memberId,
        status: ContractStatus.ACTIVE,
        pack: { billingPeriod: BillingPeriod.MONTHLY },
        startsAt: { lte: new Date() },
        OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }],
      },
      include: { pack: { select: { id: true, name: true } } },
      orderBy: { endsAt: 'desc' },
    });
    return {
      mandate: mandate ? this.toDetail(mandate) : null,
      currentMonthly: contract?.endsAt
        ? {
            contractId: contract.id,
            packId: contract.packId,
            packName: contract.pack.name,
            endsAt: contract.endsAt.toISOString(),
          }
        : null,
    };
  }

  /**
   * Alta: cobra el mes y/o guarda la tarjeta (CU-PAG-008).
   */
  async enroll(
    tenantId: string,
    memberId: string,
    staffId: string,
    actor: AuditActor,
    dto: EnrollDebitMandateDto,
  ): Promise<DebitEnrollResult> {
    const member = await this.requireActiveMember(tenantId, memberId);
    const pack = await this.requireMonthlyPack(tenantId, dto.packId);
    const existing = await this.findOpen(tenantId, memberId);
    if (existing && existing.status !== DebitMandateStatus.FAILED) {
      throw new BadRequestException(
        'Member already has an automatic debit mandate',
      );
    }

    const accessToken = await this.accounts.getDecryptedAccessToken(tenantId);
    let customer;
    try {
      customer = await this.mp.findOrCreateCustomer(
        accessToken,
        member.email,
      );
    } catch (err) {
      throw new BadRequestException(this.describeMpEnrollError(err));
    }

    let cardId: string | null = null;
    let lastFour: string | null = null;
    let paymentMethodId = dto.paymentMethodId?.trim() || null;
    try {
      const saved = await this.mp.saveCard(
        accessToken,
        customer.id,
        dto.cardToken,
      );
      cardId = saved.id;
      lastFour = saved.lastFour;
      paymentMethodId = saved.paymentMethodId ?? paymentMethodId;
    } catch (err) {
      this.logger.warn(
        `saveCard failed member=${memberId}: ${err instanceof Error ? err.message : String(err)}`,
      );
      if (!dto.chargeNow) {
        throw new BadRequestException(
          'Could not save the card. Use a credit/debit card in the Brick.',
        );
      }
    }

    let payToken = dto.cardToken;
    if (cardId) {
      try {
        payToken = await this.mp.createCardTokenFromSavedCard(
          accessToken,
          customer.id,
          cardId,
        );
      } catch {
        payToken = dto.cardToken;
      }
    }

    let transactionId: string | null = null;
    let enrolledItemId: string | null = null;
    let nextChargeOn: Date;

    if (dto.chargeNow) {
      const charged = await this.chargePackWithToken({
        tenantId,
        memberId,
        staffId,
        packId: pack.id,
        packName: pack.name,
        amount: pack.price,
        accessToken,
        token: payToken,
        customerId: cardId ? customer.id : undefined,
        paymentMethodId: paymentMethodId ?? 'visa',
        installments: dto.installments ?? 1,
        issuerId: dto.issuerId,
        identificationType: dto.identificationType,
        identificationNumber: dto.identificationNumber,
        idempotencyKey:
          dto.idempotencyKey?.trim() ||
          `debit-enroll-${randomBytes(12).toString('hex')}`,
      });
      transactionId = charged.transactionId;
      enrolledItemId = charged.transactionItemId;
      if (charged.cardId) {
        cardId = charged.cardId;
      }
      if (charged.lastFour) {
        lastFour = charged.lastFour;
      }
      if (charged.paymentMethodId) {
        paymentMethodId = charged.paymentMethodId;
      }
      nextChargeOn = charged.nextChargeOn;
    } else {
      const current = await this.requireCurrentMonthly(tenantId, memberId);
      nextChargeOn = this.businessDate(current.endsAt);
    }

    if (!cardId) {
      throw new BadRequestException(
        'Card could not be stored for later debit (payment had no card id)',
      );
    }

    const data = {
      tenantId,
      memberId,
      packId: pack.id,
      enrolledTransactionItemId: enrolledItemId,
      mpCustomerId: customer.id,
      mpCardId: cardId,
      cardLastFour: lastFour,
      cardPaymentMethodId: paymentMethodId,
      status: DebitMandateStatus.ACTIVE,
      attemptCount: 0,
      lastError: null as string | null,
      nextChargeOn,
      enrolledByStaffId: staffId,
      cancelledAt: null,
      cancelledByStaffId: null,
    };

    const row = existing
      ? await this.prisma.debitMandate.update({
          where: { id: existing.id },
          data,
          include: {
            member: { select: { name: true, email: true } },
            pack: { select: { name: true, price: true } },
          },
        })
      : await this.prisma.debitMandate.create({
          data,
          include: {
            member: { select: { name: true, email: true } },
            pack: { select: { name: true, price: true } },
          },
        });

    await this.audit.record({
      tenantId,
      actor,
      action: AUDIT_ACTIONS.debitEnroll,
      entityType: 'DebitMandate',
      entityId: row.id,
      after: {
        memberId,
        packId: pack.id,
        chargeNow: dto.chargeNow,
        transactionId,
      },
    });

    return {
      mandate: this.toDetail(row),
      transactionId,
      receiptReady: Boolean(transactionId),
    };
  }

  /**
   * Baja el mandato; el contrato vigente no se toca (RN-PAG-016).
   */
  async cancel(
    tenantId: string,
    mandateId: string,
    actor: AuditActor,
  ): Promise<DebitMandateDetail> {
    const mandate = await this.requireMandate(tenantId, mandateId);
    if (mandate.status === DebitMandateStatus.CANCELLED) {
      return this.toDetail(mandate);
    }
    const staffId = actor.profileType === 'STAFF' ? actor.userId : mandate.enrolledByStaffId;
    const row = await this.prisma.debitMandate.update({
      where: { id: mandate.id },
      data: {
        status: DebitMandateStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelledByStaffId: staffId,
      },
      include: {
        member: { select: { name: true, email: true } },
        pack: { select: { name: true, price: true } },
      },
    });
    await this.audit.record({
      tenantId,
      actor,
      action: AUDIT_ACTIONS.debitCancel,
      entityType: 'DebitMandate',
      entityId: row.id,
    });
    return this.toDetail(row);
  }

  /**
   * Baja automática si se devolvió el cobro que inscribió el mandato.
   */
  async cancelByEnrolledItems(
    tenantId: string,
    transactionItemIds: string[],
  ): Promise<void> {
    if (transactionItemIds.length === 0) {
      return;
    }
    await this.prisma.debitMandate.updateMany({
      where: {
        tenantId,
        enrolledTransactionItemId: { in: transactionItemIds },
        status: { in: OPEN_STATUSES },
      },
      data: {
        status: DebitMandateStatus.CANCELLED,
        cancelledAt: new Date(),
      },
    });
  }

  /**
   * Cambia el pack del próximo cobro (sin solapar contratos).
   */
  async updatePack(
    tenantId: string,
    mandateId: string,
    packId: string,
    actor: AuditActor,
  ): Promise<DebitMandateDetail> {
    const mandate = await this.requireMandate(tenantId, mandateId);
    if (mandate.status === DebitMandateStatus.CANCELLED) {
      throw new BadRequestException('Mandate is cancelled');
    }
    await this.requireMonthlyPack(tenantId, packId);
    const row = await this.prisma.debitMandate.update({
      where: { id: mandate.id },
      data: { packId },
      include: {
        member: { select: { name: true, email: true } },
        pack: { select: { name: true, price: true } },
      },
    });
    await this.audit.record({
      tenantId,
      actor,
      action: AUDIT_ACTIONS.debitUpdatePack,
      entityType: 'DebitMandate',
      entityId: row.id,
      after: { packId },
    });
    return this.toDetail(row);
  }

  /**
   * Cobra el pack del mandato (job o “Cobrar ahora”).
   *
   * @remarks Idempotente por periodo `endsAt` (RN-PAG-015).
   */
  async charge(
    tenantId: string,
    mandateId: string,
    actor: AuditActor,
    source: 'job' | 'staff',
  ): Promise<DebitEnrollResult> {
    const mandate = await this.requireMandate(tenantId, mandateId);
    if (mandate.status === DebitMandateStatus.CANCELLED) {
      throw new BadRequestException('Mandate is cancelled');
    }
    const pack = await this.requireMonthlyPack(tenantId, mandate.packId);
    const period = this.formatYmd(mandate.nextChargeOn);
    const prefix = `debit:${mandate.id}:${period}`;

    const existingTx = await this.prisma.transaction.findFirst({
      where: {
        tenantId,
        memberId: mandate.memberId,
        idempotencyKey: { startsWith: prefix },
        status: { in: [PaymentStatus.PENDING, PaymentStatus.APPROVED] },
      },
      include: { transactionItems: true },
    });
    if (existingTx?.status === PaymentStatus.APPROVED) {
      await this.markChargeSuccess(mandate.id, existingTx.transactionItems[0]?.id);
      const refreshed = await this.requireMandate(tenantId, mandate.id);
      return {
        mandate: this.toDetail(refreshed),
        transactionId: existingTx.id,
        receiptReady: true,
      };
    }
    if (existingTx?.status === PaymentStatus.PENDING) {
      throw new BadRequestException(
        'A debit payment for this period is already pending',
      );
    }

    const accessToken = await this.accounts.getDecryptedAccessToken(tenantId);
    let token: string;
    try {
      token = await this.mp.createCardTokenFromSavedCard(
        accessToken,
        mandate.mpCustomerId,
        mandate.mpCardId,
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Could not tokenize saved card';
      await this.markChargeFailure(mandate, message);
      throw new BadRequestException(message);
    }

    const staffId =
      actor.profileType === 'STAFF' ? actor.userId : mandate.enrolledByStaffId;
    try {
      const charged = await this.chargePackWithToken({
        tenantId,
        memberId: mandate.memberId,
        staffId,
        packId: pack.id,
        packName: pack.name,
        amount: pack.price,
        accessToken,
        token,
        customerId: mandate.mpCustomerId,
        paymentMethodId: mandate.cardPaymentMethodId ?? 'visa',
        installments: 1,
        idempotencyKey: `${prefix}:${mandate.attemptCount}`,
      });
      await this.prisma.debitMandate.update({
        where: { id: mandate.id },
        data: {
          status: DebitMandateStatus.ACTIVE,
          attemptCount: 0,
          lastError: null,
          lastChargedAt: new Date(),
          nextChargeOn: charged.nextChargeOn,
        },
      });
      await this.audit.record({
        tenantId,
        actor,
        action: AUDIT_ACTIONS.debitCharge,
        entityType: 'DebitMandate',
        entityId: mandate.id,
        after: { source, transactionId: charged.transactionId },
      });
      const refreshed = await this.requireMandate(tenantId, mandate.id);
      return {
        mandate: this.toDetail(refreshed),
        transactionId: charged.transactionId,
        receiptReady: true,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Debit charge failed';
      await this.markChargeFailure(mandate, message);
      throw new BadRequestException(message);
    }
  }

  /**
   * Job: cobra mandatos con `nextChargeOn` ≤ hoy (timezone BA).
   */
  async chargeDue(): Promise<{ attempted: number; ok: number; failed: number }> {
    const today = this.businessDate(new Date());
    const due = await this.prisma.debitMandate.findMany({
      where: {
        status: {
          in: [DebitMandateStatus.ACTIVE, DebitMandateStatus.RETRYING],
        },
        nextChargeOn: { lte: today },
        attemptCount: { lt: 3 },
      },
    });
    let ok = 0;
    let failed = 0;
    for (const mandate of due) {
      try {
        await this.charge(
          mandate.tenantId,
          mandate.id,
          {
            profileType: 'STAFF',
            userId: mandate.enrolledByStaffId,
          },
          'job',
        );
        ok += 1;
      } catch (err) {
        failed += 1;
        this.logger.warn(
          `debit job mandate=${mandate.id}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
    return { attempted: due.length, ok, failed };
  }

  private async chargePackWithToken(input: {
    tenantId: string;
    memberId: string;
    staffId: string;
    packId: string;
    packName: string;
    amount: number;
    accessToken: string;
    token: string;
    customerId?: string;
    paymentMethodId: string;
    installments: number;
    issuerId?: string;
    identificationType?: string;
    identificationNumber?: string;
    idempotencyKey: string;
  }): Promise<{
    transactionId: string;
    transactionItemId: string;
    nextChargeOn: Date;
    cardId: string | null;
    lastFour: string | null;
    paymentMethodId: string | null;
  }> {
    const pack = await this.prisma.pack.findFirstOrThrow({
      where: { id: input.packId, tenantId: input.tenantId },
      include: {
        components: { include: { service: { select: { name: true } } } },
      },
    });
    const copy = mpCopyForPack(
      pack.name,
      pack.components.map((c) => ({
        name: c.service.name,
        credits: c.creditAmount,
      })),
    );

    const existing = await this.prisma.transaction.findUnique({
      where: {
        tenantId_idempotencyKey: {
          tenantId: input.tenantId,
          idempotencyKey: input.idempotencyKey,
        },
      },
      include: { transactionItems: true },
    });
    let cart = existing;
    if (!cart) {
      cart = await this.prisma.transaction.create({
        data: {
          tenantId: input.tenantId,
          memberId: input.memberId,
          amount: input.amount,
          status: PaymentStatus.PENDING,
          idempotencyKey: input.idempotencyKey,
          recordedByStaffId: input.staffId,
          transactionItems: {
            create: {
              tenantId: input.tenantId,
              memberId: input.memberId,
              packId: input.packId,
              amount: input.amount,
              status: PaymentStatus.PENDING,
              method: PaymentMethod.MP,
              idempotencyKey: `${input.idempotencyKey}:0`,
            },
          },
        },
        include: { transactionItems: true },
      });
    }

    const item = cart.transactionItems[0];
    if (!item) {
      throw new BadRequestException('Debit cart missing transaction item');
    }

    const payment = await this.mp.createCardPayment({
      accessToken: input.accessToken,
      amount: input.amount,
      token: input.token,
      description: copy.title,
      externalReference: cart.id,
      notificationUrl: this.buildNotificationUrl(input.tenantId),
      payerEmail: (await this.prisma.member.findUniqueOrThrow({
        where: { id: input.memberId },
      })).email,
      paymentMethodId: input.paymentMethodId,
      installments: input.installments,
      issuerId: input.issuerId,
      customerId: input.customerId,
      identificationType: input.identificationType,
      identificationNumber: input.identificationNumber,
      idempotencyKey: input.idempotencyKey,
    });

    const mapped = payment.status.toLowerCase();
    if (mapped !== 'approved') {
      throw new BadRequestException(
        payment.statusDetail
          ? `Mercado Pago ${payment.status}: ${payment.statusDetail}`
          : `Mercado Pago payment ${payment.status}`,
      );
    }

    await this.webhook.applyMpPaymentToCart(
      input.tenantId,
      cart.id,
      payment.id,
      payment.status,
    );

    const contract = await this.prisma.contract.findUnique({
      where: { transactionItemId: item.id },
    });
    const nextChargeOn = contract?.endsAt
      ? this.businessDate(contract.endsAt)
      : this.addDays(this.businessDate(new Date()), 30);

    return {
      transactionId: cart.id,
      transactionItemId: item.id,
      nextChargeOn,
      cardId: payment.cardId,
      lastFour: payment.lastFour,
      paymentMethodId: payment.paymentMethodId,
    };
  }

  private async markChargeSuccess(
    mandateId: string,
    transactionItemId: string | undefined,
  ): Promise<void> {
    const contract = transactionItemId
      ? await this.prisma.contract.findUnique({
          where: { transactionItemId },
        })
      : null;
    await this.prisma.debitMandate.update({
      where: { id: mandateId },
      data: {
        status: DebitMandateStatus.ACTIVE,
        attemptCount: 0,
        lastError: null,
        lastChargedAt: new Date(),
        ...(contract?.endsAt
          ? { nextChargeOn: this.businessDate(contract.endsAt) }
          : {}),
      },
    });
  }

  private async markChargeFailure(
    mandate: DebitMandate,
    message: string,
  ): Promise<void> {
    const attempts = mandate.attemptCount + 1;
    const failed = attempts >= 3;
    await this.prisma.debitMandate.update({
      where: { id: mandate.id },
      data: {
        attemptCount: attempts,
        lastError: message.slice(0, 500),
        status: failed
          ? DebitMandateStatus.FAILED
          : DebitMandateStatus.RETRYING,
        nextChargeOn: failed
          ? mandate.nextChargeOn
          : this.addDays(mandate.nextChargeOn, 1),
      },
    });
  }

  private async findOpen(
    tenantId: string,
    memberId: string,
  ): Promise<MandateRow | null> {
    return this.prisma.debitMandate.findFirst({
      where: { tenantId, memberId, status: { in: OPEN_STATUSES } },
      include: {
        member: { select: { name: true, email: true } },
        pack: { select: { name: true, price: true } },
      },
    });
  }

  private async requireMandate(
    tenantId: string,
    mandateId: string,
  ): Promise<MandateRow> {
    const row = await this.prisma.debitMandate.findFirst({
      where: { id: mandateId, tenantId },
      include: {
        member: { select: { name: true, email: true } },
        pack: { select: { name: true, price: true } },
      },
    });
    if (!row) {
      throw new NotFoundException(`Debit mandate ${mandateId} not found`);
    }
    return row;
  }

  private async requireMonthlyPack(tenantId: string, packId: string) {
    const pack = await this.prisma.pack.findFirst({
      where: { id: packId, tenantId },
    });
    if (!pack) {
      throw new NotFoundException(`Pack ${packId} not found in tenant`);
    }
    if (!pack.active) {
      throw new BadRequestException('Pack is inactive');
    }
    if (pack.billingPeriod !== BillingPeriod.MONTHLY) {
      throw new BadRequestException('Automatic debit is only for MONTHLY packs');
    }
    if (pack.price < 1) {
      throw new BadRequestException('Pack price must be at least 1');
    }
    return pack;
  }

  private async requireActiveMember(tenantId: string, memberId: string) {
    const member = await this.prisma.member.findFirst({
      where: { id: memberId, tenantId },
    });
    if (!member) {
      throw new NotFoundException(`Member ${memberId} not found`);
    }
    if (member.status !== MemberStatus.ACTIVE) {
      throw new BadRequestException('Member is not active');
    }
    return member;
  }

  private async requireCurrentMonthly(tenantId: string, memberId: string) {
    const contract = await this.prisma.contract.findFirst({
      where: {
        tenantId,
        memberId,
        status: ContractStatus.ACTIVE,
        pack: { billingPeriod: BillingPeriod.MONTHLY },
        endsAt: { not: null },
      },
      orderBy: { endsAt: 'desc' },
    });
    if (!contract?.endsAt) {
      throw new BadRequestException(
        'Member has no MONTHLY contract to attach debit to',
      );
    }
    return contract as typeof contract & { endsAt: Date };
  }

  private toDetail(row: MandateRow): DebitMandateDetail {
    return {
      id: row.id,
      memberId: row.memberId,
      memberName: row.member.name,
      memberEmail: row.member.email,
      packId: row.packId,
      packName: row.pack.name,
      packPrice: row.pack.price,
      status: row.status,
      attemptCount: row.attemptCount,
      lastError: row.lastError,
      lastChargedAt: row.lastChargedAt?.toISOString() ?? null,
      nextChargeOn: this.formatYmd(row.nextChargeOn),
      cardLastFour: row.cardLastFour,
      enrolledTransactionItemId: row.enrolledTransactionItemId,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private businessDate(at: Date): Date {
    return this.parseYmd(this.formatYmd(at));
  }

  private formatYmd(at: Date): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(at);
  }

  private parseYmd(ymd: string): Date {
    const [year, month, day] = ymd.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }

  private addDays(date: Date, days: number): Date {
    const next = new Date(date);
    next.setUTCDate(next.getUTCDate() + days);
    return next;
  }

  /**
   * Mensaje de Caja cuando MP rechaza Customer/Card (p. ej. sin scope payments).
   */
  private describeMpEnrollError(err: unknown): string {
    const raw = err instanceof Error ? err.message : String(err);
    if (/live credentials/i.test(raw) || /HTTP 401/.test(raw)) {
      return 'Mercado Pago rechazó guardar la tarjeta (el token no tiene permiso Customers/Payments). En Config volvé a pegar Public Key y Access Token de credenciales de prueba, con la app en API Pagos.';
    }
    return raw.startsWith('Mercado Pago')
      ? raw
      : 'No se pudo inscribir el débito en Mercado Pago';
  }

  private buildNotificationUrl(tenantId: string): string {
    const publicBase =
      this.config.get<string>('PUBLIC_API_BASE_URL')?.replace(/\/$/, '') ||
      'http://localhost:3001';
    return `${publicBase}/api/webhooks/payment?tenantId=${tenantId}`;
  }
}
