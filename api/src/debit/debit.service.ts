import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BillingPeriod,
  ContractStatus,
  DebitMandate,
  DebitMandateStatus,
  MemberStatus,
  NotificationEventCode,
  PaymentMethod,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { AUDIT_ACTIONS, AuditActor } from '../audit/audit.types';
import { AuditService } from '../audit/audit.service';
import { NotificationDispatcher } from '../notifications/notifications.service';
import { ListResult, normalizeListQuery, toListResult } from '../common/list';
import { MercadoPagoAccountService } from '../payment/mercadopago-account.service';
import { MP_ACCOUNT_PORT, MpAccountPort } from '../payment/mp-account.port';
import { MpWebhookProcessResult } from '../payment/payment.types';
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
  DebitMandateStatus.PENDING_CHECKOUT,
  DebitMandateStatus.ACTIVE,
  DebitMandateStatus.RETRYING,
  DebitMandateStatus.FAILED,
];

type MandateRow = DebitMandate & {
  member: { name: string | null; email: string } | null;
  pack: { name: string; price: number };
};

/**
 * Mandatos MONTHLY = suscripción Mercado Pago (`preapproval`).
 *
 * @remarks RN-PAG-013..016 / CU-PAG-008..010. Sin PAN ni job de cobro.
 */
@Injectable()
export class DebitService {
  private readonly logger = new Logger(DebitService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly accounts: MercadoPagoAccountService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationDispatcher,
    private readonly config: ConfigService,
    @Inject(forwardRef(() => WebhookPaymentService))
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
    const where: Prisma.DebitMandateWhereInput = { tenantId };
    if (query.memberId) {
      where.memberId = query.memberId;
    }
    const bucket = query.bucket ?? 'all';
    if (bucket === 'due' || bucket === 'pending') {
      where.status = DebitMandateStatus.PENDING_CHECKOUT;
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
    return toListResult(
      rows.map((r) => this.toDetail(r)),
      total,
      page,
      pageSize,
    );
  }

  /**
   * Mandato abierto + MONTHLY vigente (autorizar sin cobro ahora).
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
   * Alta: crea `preapproval` pending y devuelve `init_point` (CU-PAG-008).
   *
   * @remarks `chargeNow` true = primer cobro al autorizar. false = `start_date`
   * = `endsAt` del MONTHLY vigente.
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
    if (
      existing &&
      existing.status !== DebitMandateStatus.FAILED &&
      existing.status !== DebitMandateStatus.PENDING_CHECKOUT
    ) {
      throw new BadRequestException(
        'Member already has an automatic debit mandate',
      );
    }

    let startDate: string | undefined;
    let nextChargeOn: Date | null = null;
    if (dto.chargeNow) {
      nextChargeOn = this.businessDate(new Date());
    } else {
      const current = await this.requireCurrentMonthly(tenantId, memberId);
      startDate = current.endsAt.toISOString();
      nextChargeOn = this.businessDate(current.endsAt);
    }

    const accessToken = await this.accounts.getDecryptedAccessToken(tenantId);
    const backUrl = this.webBackUrl();
    const notificationUrl = this.buildNotificationUrl(tenantId);

    if (existing?.mpPreapprovalId) {
      await this.tryCancelRemote(accessToken, existing.mpPreapprovalId);
    }

    const payerEmail = this.resolvePayerEmail(
      dto.payerEmail,
      existing?.mpPayerEmail,
      member.email,
    );

    const seed = {
      tenantId,
      memberId,
      packId: pack.id,
      status: DebitMandateStatus.PENDING_CHECKOUT,
      attemptCount: 0,
      lastError: null as string | null,
      nextChargeOn,
      enrolledByStaffId: staffId,
      cancelledAt: null,
      cancelledByStaffId: null,
      mpPreapprovalId: null as string | null,
      mpPreapprovalPlanId: null as string | null,
      mpPayerEmail: payerEmail,
      initPoint: null as string | null,
    };

    const seeded = existing
      ? await this.prisma.debitMandate.update({
          where: { id: existing.id },
          data: seed,
          include: {
            member: { select: { name: true, email: true } },
            pack: { select: { name: true, price: true } },
          },
        })
      : await this.prisma.debitMandate.create({
          data: seed,
          include: {
            member: { select: { name: true, email: true } },
            pack: { select: { name: true, price: true } },
          },
        });

    let sub;
    try {
      sub = await this.mp.createPreapproval({
        accessToken,
        reason: `${pack.name} · ${member.email}`,
        externalReference: seeded.id,
        payerEmail,
        backUrl,
        notificationUrl,
        amount: pack.price,
        startDate,
      });
    } catch (err) {
      throw new BadRequestException(this.describeMpEnrollError(err));
    }

    const row = await this.prisma.debitMandate.update({
      where: { id: seeded.id },
      data: {
        mpPreapprovalId: sub.id,
        initPoint: sub.initPoint,
      },
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
        mpPreapprovalId: sub.id,
      },
    });

    return {
      mandate: this.toDetail(row),
      transactionId: null,
      receiptReady: false,
      checkoutUrl: sub.initPoint,
    };
  }

  /**
   * Webhook `subscription_preapproval` de un mandato de gym (no plataforma).
   */
  async handlePreapproval(
    tenantId: string,
    preapprovalId: string,
  ): Promise<MpWebhookProcessResult> {
    const accessToken = await this.accounts.getDecryptedAccessToken(tenantId);
    const remote = await this.mp.getPreapproval(accessToken, preapprovalId);
    const mandate = await this.findByPreapproval(
      tenantId,
      remote.externalReference,
      remote.id,
    );
    if (!mandate) {
      return this.emptyWebhook(false, remote.status);
    }
    const authorized =
      remote.status === 'authorized' || remote.status === 'active';
    const failed =
      remote.status === 'cancelled' ||
      remote.status === 'paused' ||
      remote.status === 'rejected';
    if (authorized && mandate.status === DebitMandateStatus.PENDING_CHECKOUT) {
      await this.prisma.debitMandate.update({
        where: { id: mandate.id },
        data: { status: DebitMandateStatus.ACTIVE, lastError: null },
      });
    }
    if (failed && OPEN_STATUSES.includes(mandate.status)) {
      await this.prisma.debitMandate.update({
        where: { id: mandate.id },
        data: {
          status: DebitMandateStatus.FAILED,
          lastError: `MP preapproval ${remote.status}`,
        },
      });
      await this.notifyMandateFailed(mandate);
    }
    return this.emptyWebhook(true, remote.status);
  }

  /**
   * Ciclo cobrado por MP → Transaction PACK + contrato (CU-PAG-009).
   */
  async applyAuthorizedPayment(
    tenantId: string,
    input: {
      preapprovalId: string | null;
      externalReference: string | null;
      paymentId: string | null;
      status: string;
    },
  ): Promise<MpWebhookProcessResult> {
    const mandate = await this.findByPreapproval(
      tenantId,
      input.externalReference,
      input.preapprovalId,
    );
    if (!mandate || mandate.tenantId !== tenantId) {
      return this.emptyWebhook(false, input.status);
    }
    if (!input.paymentId) {
      await this.prisma.debitMandate.update({
        where: { id: mandate.id },
        data: { status: DebitMandateStatus.ACTIVE },
      });
      return this.emptyWebhook(true, input.status);
    }
    return this.applyMpPayment(
      tenantId,
      mandate.id,
      input.paymentId,
      input.status,
    );
  }

  /**
   * Pago MP cuyo `external_reference` es el id del mandato.
   */
  async applyMpPayment(
    tenantId: string,
    mandateId: string,
    mpPaymentId: string,
    remoteStatus: string,
  ): Promise<MpWebhookProcessResult> {
    const mandate = await this.requireMandate(tenantId, mandateId);
    const mapped = remoteStatus.toLowerCase();
    if (mapped !== 'approved' && mapped !== 'processed') {
      const chargeFailed =
        mapped === 'rejected' || mapped === 'cancelled';
      const waiting = mapped === 'pending' || mapped === 'in_process';
      if (
        (chargeFailed || waiting) &&
        mandate.status !== DebitMandateStatus.CANCELLED
      ) {
        await this.prisma.debitMandate.update({
          where: { id: mandate.id },
          data: {
            lastError: `MP payment ${remoteStatus}`,
            status: DebitMandateStatus.RETRYING,
          },
        });
      }
      if (chargeFailed) {
        await this.notifyChargeFailed(mandate, remoteStatus, mpPaymentId);
      }
      return this.emptyWebhook(true, remoteStatus);
    }

    const pack = await this.requireMonthlyPack(tenantId, mandate.packId);
    const idempotencyKey = `debit-mp:${mpPaymentId}`;
    let cart = await this.prisma.transaction.findUnique({
      where: {
        tenantId_idempotencyKey: { tenantId, idempotencyKey },
      },
      include: { transactionItems: true },
    });
    if (!cart) {
      cart = await this.prisma.transaction.create({
        data: {
          tenantId,
          memberId: mandate.memberId,
          amount: pack.price,
          status: PaymentStatus.PENDING,
          idempotencyKey,
          recordedByStaffId: mandate.enrolledByStaffId,
          transactionItems: {
            create: {
              tenantId,
              memberId: mandate.memberId,
              packId: pack.id,
              amount: pack.price,
              status: PaymentStatus.PENDING,
              method: PaymentMethod.MP,
              idempotencyKey: `${idempotencyKey}:0`,
            },
          },
        },
        include: { transactionItems: true },
      });
    }

    const result = await this.webhook.applyMpPaymentToCart(
      tenantId,
      cart.id,
      mpPaymentId,
      remoteStatus,
    );
    const itemId = cart.transactionItems[0]?.id;
    const contract = itemId
      ? await this.prisma.contract.findUnique({
          where: { transactionItemId: itemId },
        })
      : null;
    await this.prisma.debitMandate.update({
      where: { id: mandate.id },
      data: {
        status: DebitMandateStatus.ACTIVE,
        lastError: null,
        lastChargedAt: new Date(),
        enrolledTransactionItemId:
          mandate.enrolledTransactionItemId ?? itemId ?? undefined,
        nextChargeOn: contract?.endsAt
          ? this.businessDate(contract.endsAt)
          : mandate.nextChargeOn,
      },
    });
    return result;
  }

  /**
   * Baja el mandato y cancela el preapproval (RN-PAG-016).
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
    if (mandate.mpPreapprovalId) {
      const accessToken =
        await this.accounts.getDecryptedAccessToken(tenantId);
      await this.tryCancelRemote(accessToken, mandate.mpPreapprovalId);
    }
    const staffId =
      actor.profileType === 'STAFF' ? actor.userId : mandate.enrolledByStaffId;
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

  private async notifyChargeFailed(
    mandate: MandateRow,
    remoteStatus: string,
    mpPaymentId: string,
  ): Promise<void> {
    if (!mandate.memberId) {
      return;
    }
    await this.notifications.notifyMember({
      tenantId: mandate.tenantId,
      memberId: mandate.memberId,
      event: NotificationEventCode.DEBIT_CHARGE_FAILED,
      idempotencyKey: `DEBIT_CHARGE_FAILED:${mandate.id}:${mpPaymentId}`,
      extraVars: {
        pack: mandate.pack.name,
        motivo: remoteStatus,
      },
      payload: { mandateId: mandate.id, mpPaymentId, remoteStatus },
    });
  }

  private async notifyMandateFailed(mandate: MandateRow): Promise<void> {
    if (!mandate.memberId) {
      return;
    }
    await this.notifications.notifyMember({
      tenantId: mandate.tenantId,
      memberId: mandate.memberId,
      event: NotificationEventCode.DEBIT_MANDATE_FAILED,
      idempotencyKey: `DEBIT_MANDATE_FAILED:${mandate.id}`,
      extraVars: { pack: mandate.pack.name },
      payload: { mandateId: mandate.id },
    });
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
    const rows = await this.prisma.debitMandate.findMany({
      where: {
        tenantId,
        enrolledTransactionItemId: { in: transactionItemIds },
        status: { in: OPEN_STATUSES },
      },
    });
    if (rows.length === 0) {
      return;
    }
    const accessToken = await this.accounts.getDecryptedAccessToken(tenantId);
    for (const row of rows) {
      if (row.mpPreapprovalId) {
        await this.tryCancelRemote(accessToken, row.mpPreapprovalId);
      }
    }
    await this.prisma.debitMandate.updateMany({
      where: { id: { in: rows.map((r) => r.id) } },
      data: {
        status: DebitMandateStatus.CANCELLED,
        cancelledAt: new Date(),
      },
    });
  }

  /**
   * Cancela preapproval A y alta B para el próximo cobro (RN-PAG-016).
   */
  async updatePack(
    tenantId: string,
    mandateId: string,
    packId: string,
    actor: AuditActor,
    payerEmailInput?: string,
  ): Promise<DebitMandateDetail> {
    const mandate = await this.requireMandate(tenantId, mandateId);
    if (mandate.status === DebitMandateStatus.CANCELLED) {
      throw new BadRequestException('Mandate is cancelled');
    }
    const pack = await this.requireMonthlyPack(tenantId, packId);
    const accessToken = await this.accounts.getDecryptedAccessToken(tenantId);
    if (mandate.mpPreapprovalId) {
      await this.tryCancelRemote(accessToken, mandate.mpPreapprovalId);
    }
    const member = await this.requireActiveMember(tenantId, mandate.memberId);
    const startDate = mandate.nextChargeOn
      ? mandate.nextChargeOn.toISOString()
      : undefined;
    const payerEmail = this.resolvePayerEmail(
      payerEmailInput,
      mandate.mpPayerEmail,
      member.email,
    );
    const backUrl = this.webBackUrl();
    const notificationUrl = this.buildNotificationUrl(tenantId);
    const sub = await this.mp.createPreapproval({
      accessToken,
      reason: `${pack.name} · ${member.email}`,
      externalReference: mandate.id,
      payerEmail,
      backUrl,
      notificationUrl,
      amount: pack.price,
      startDate,
    });
    const row = await this.prisma.debitMandate.update({
      where: { id: mandate.id },
      data: {
        packId,
        mpPreapprovalId: sub.id,
        mpPreapprovalPlanId: null,
        mpPayerEmail: payerEmail,
        initPoint: sub.initPoint,
        status: DebitMandateStatus.PENDING_CHECKOUT,
        lastError: null,
      },
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
      after: { packId, mpPreapprovalId: sub.id },
    });
    return this.toDetail(row);
  }

  private async tryCancelRemote(
    accessToken: string,
    preapprovalId: string,
  ): Promise<void> {
    try {
      await this.mp.cancelPreapproval(accessToken, preapprovalId);
    } catch (err) {
      this.logger.warn(
        `cancel preapproval ${preapprovalId}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  private async findByPreapproval(
    tenantId: string,
    externalReference: string | null,
    preapprovalId: string | null,
  ): Promise<MandateRow | null> {
    if (externalReference) {
      const byId = await this.prisma.debitMandate.findFirst({
        where: { id: externalReference, tenantId },
        include: {
          member: { select: { name: true, email: true } },
          pack: { select: { name: true, price: true } },
        },
      });
      if (byId) {
        return byId;
      }
    }
    if (!preapprovalId) {
      return null;
    }
    return this.prisma.debitMandate.findFirst({
      where: { tenantId, mpPreapprovalId: preapprovalId },
      include: {
        member: { select: { name: true, email: true } },
        pack: { select: { name: true, price: true } },
      },
    });
  }

  private emptyWebhook(
    handled: boolean,
    status: string | null,
  ): MpWebhookProcessResult {
    return {
      handled,
      transactionItemId: null,
      transactionId: null,
      status,
      contractId: null,
      reservationId: null,
    };
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
      throw new BadRequestException(
        'Automatic debit is only for MONTHLY packs',
      );
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
      memberName: row.member?.name ?? null,
      memberEmail: row.member?.email ?? '',
      payerEmail: row.mpPayerEmail ?? row.member?.email ?? '',
      packId: row.packId,
      packName: row.pack.name,
      packPrice: row.pack.price,
      status: row.status,
      attemptCount: row.attemptCount,
      lastError: row.lastError,
      lastChargedAt: row.lastChargedAt?.toISOString() ?? null,
      nextChargeOn: row.nextChargeOn ? this.formatYmd(row.nextChargeOn) : null,
      initPoint: row.initPoint,
      enrolledTransactionItemId: row.enrolledTransactionItemId,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  /**
   * MP solo deja autorizar al usuario logueado con `payer_email`.
   */
  private resolvePayerEmail(
    input: string | undefined,
    saved: string | null | undefined,
    memberEmail: string,
  ): string {
    return (input?.trim() || saved || memberEmail).toLowerCase();
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

  private describeMpEnrollError(err: unknown): string {
    const raw = err instanceof Error ? err.message : String(err);
    if (/live credentials/i.test(raw) || /HTTP 401/.test(raw)) {
      return 'Mercado Pago rechazó la suscripción. En Config revisá el token y que la app tenga Suscripciones.';
    }
    return raw.startsWith('Mercado Pago')
      ? raw
      : 'No se pudo crear el link de débito en Mercado Pago';
  }

  private buildNotificationUrl(tenantId: string): string {
    const publicBase =
      this.config.get<string>('PUBLIC_API_BASE_URL')?.replace(/\/$/, '') ||
      'http://localhost:3001';
    return `${publicBase}/api/webhooks/payment?tenantId=${tenantId}`;
  }

  private webBackUrl(): string {
    const web =
      this.config.get<string>('PUBLIC_WEB_BASE_URL')?.replace(/\/$/, '') ||
      'http://localhost:3002';
    return `${web}/caja`;
  }
}
