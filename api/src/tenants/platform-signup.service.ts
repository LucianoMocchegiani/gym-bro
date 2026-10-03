import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  BillingPeriod,
  NotificationEventCode,
  PlatformSignup,
  PlatformSignupStatus,
  TenantStatus,
} from '@prisma/client';
import { MpRemotePreapproval } from '../payment/mp-account.port';
import { MpWebhookProcessResult } from '../payment/payment.types';
import { MercadoPagoAccountService } from '../payment/mercadopago-account.service';
import { MP_ACCOUNT_PORT, MpAccountPort } from '../payment/mp-account.port';
import { CashPaymentService } from '../payment/cash-payment.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationDispatcher } from '../notifications/notifications.service';
import {
  addCalendarDays,
  PLATFORM_ADMIN_SLUG,
  PLATFORM_TRIAL_DAYS,
} from './platform-trial';
import { PlatformTrialService } from './platform-trial.service';
import { TenantsService } from './tenants.service';
import { assertValidTenantSlug, normalizeTenantSlug } from './tenant-slug';
import type { GymPlanView } from './tenants.types';

export type PlatformSignupView = {
  id: string;
  gymName: string;
  slug: string;
  packId: string;
  packName: string;
  applyTrial: boolean;
  status: PlatformSignupStatus;
  checkoutUrl: string | null;
  tenantId: string | null;
  tenantSlug: string | null;
};

/** Un intento sin autorizar en MP libera el subdominio después de esto. */
const PENDING_SIGNUP_TTL_MS = 60 * 60 * 1000;

const OPEN_SIGNUP_STATUSES: PlatformSignupStatus[] = [
  PlatformSignupStatus.PENDING,
  PlatformSignupStatus.AWAITING_PAYMENT,
];

export type IdentityGymRow = {
  tenantId: string;
  name: string;
  slug: string;
  status: TenantStatus;
};

/**
 * Self-serve Faciliter: checkout MP y nacimiento del gym en el webhook.
 *
 * @remarks Con prueba el gym nace al autorizar el preapproval. Sin prueba,
 * nace en el primer cobro approved. RN-PAG-017. Además del webhook, se
 * consulta en MP el preapproval (y, sin prueba, sus cobros) al listar los
 * gyms del dueño y cada hora; un intento sin autorizar en 1 h vence, libera
 * el slug y se cancela en MP. La prueba solo aplica si el pack la ofrece.
 */
@Injectable()
export class PlatformSignupService {
  private readonly logger = new Logger(PlatformSignupService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly trial: PlatformTrialService,
    private readonly tenants: TenantsService,
    @Inject(forwardRef(() => CashPaymentService))
    private readonly cash: CashPaymentService,
    private readonly accounts: MercadoPagoAccountService,
    private readonly config: ConfigService,
    @Inject(MP_ACCOUNT_PORT) private readonly mp: MpAccountPort,
    private readonly notifications: NotificationDispatcher,
  ) {}

  /**
   * Gyms cuya Identity es dueña.
   */
  async listOwnedGyms(identityId: string): Promise<IdentityGymRow[]> {
    const pending = await this.prisma.platformSignup.findMany({
      where: {
        identityId,
        status: { in: OPEN_SIGNUP_STATUSES },
        mpPreapprovalId: { not: null },
      },
    });
    for (const signup of pending) {
      await this.reconcileSafely(signup);
    }
    const rows = await this.prisma.tenant.findMany({
      where: {
        ownerIdentityId: identityId,
        slug: { not: PLATFORM_ADMIN_SLUG },
      },
      select: { id: true, name: true, slug: true, status: true },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => ({
      tenantId: row.id,
      name: row.name,
      slug: row.slug,
      status: row.status,
    }));
  }

  /**
   * Plan de un gym del dueño (misma vista que staff GET /plan).
   */
  async getOwnedGymPlan(
    identityId: string,
    tenantId: string,
  ): Promise<GymPlanView> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { ownerIdentityId: true, slug: true },
    });
    if (!tenant || tenant.ownerIdentityId !== identityId) {
      throw new NotFoundException(`Tenant ${tenantId} not found`);
    }
    const staff = await this.prisma.staffUser.findFirst({
      where: { tenantId, identityId, active: true },
      select: { id: true },
    });
    if (!staff) {
      throw new NotFoundException(`Tenant ${tenantId} not found`);
    }
    return this.tenants.getGymPlan(tenantId, staff.id);
  }

  /**
   * Crea preapproval en MP de `admin` y reserva slug.
   */
  async startCheckout(
    identityId: string,
    input: {
      packId: string;
      slug: string;
      gymName: string;
      payerEmail?: string;
    },
  ): Promise<PlatformSignupView> {
    const slug = normalizeTenantSlug(input.slug);
    assertValidTenantSlug(slug);
    if (slug === PLATFORM_ADMIN_SLUG) {
      throw new BadRequestException('slug is reserved');
    }
    const gymName = input.gymName.trim();
    if (gymName.length < 2) {
      throw new BadRequestException('gymName must be at least 2 characters');
    }

    await this.releaseSlug(slug, identityId);

    const taken = await this.prisma.tenant.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (taken) {
      throw new ConflictException('Ese subdominio ya está en uso');
    }

    const admin = await this.requireAdminTenant();
    const pack = await this.prisma.pack.findFirst({
      where: {
        id: input.packId,
        tenantId: admin.id,
        active: true,
        originServiceId: null,
      },
      include: { components: true },
    });
    if (!pack || pack.components.length === 0) {
      throw new BadRequestException('Pack de plataforma no disponible');
    }
    if (pack.billingPeriod !== BillingPeriod.MONTHLY) {
      throw new BadRequestException(
        'El alta self-serve solo admite packs mensuales',
      );
    }
    if (pack.price < 1) {
      throw new BadRequestException('Pack price must be at least 1');
    }

    const applyTrial =
      pack.offersPlatformTrial &&
      (await this.trial.evaluateForIdentity(identityId)).eligible;

    const identity = await this.prisma.identity.findUnique({
      where: { id: identityId },
      select: { email: true },
    });
    if (!identity) {
      throw new NotFoundException(`Identity ${identityId} not found`);
    }

    const accessToken = await this.accounts.getDecryptedAccessToken(admin.id);
    const backUrl = this.webBackUrl();
    const notificationUrl = this.notificationUrl(admin.id);

    let signup;
    try {
      signup = await this.prisma.platformSignup.create({
        data: {
          identityId,
          gymName,
          slug,
          packId: pack.id,
          applyTrial,
          status: PlatformSignupStatus.PENDING,
        },
      });
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        (error as { code: string }).code === 'P2002'
      ) {
        throw new ConflictException('Ese subdominio ya está en uso');
      }
      throw error;
    }

    const trialStart = applyTrial
      ? addCalendarDays(new Date(), PLATFORM_TRIAL_DAYS).toISOString()
      : undefined;

    try {
      const sub = await this.mp.createPreapproval({
        accessToken,
        reason: `Faciliter ${pack.name} · ${gymName}`,
        externalReference: signup.id,
        payerEmail: (input.payerEmail?.trim() || identity.email).toLowerCase(),
        backUrl,
        notificationUrl,
        amount: pack.price,
        startDate: trialStart,
      });
      const updated = await this.prisma.platformSignup.update({
        where: { id: signup.id },
        data: {
          mpPreapprovalId: sub.id,
          initPoint: sub.initPoint,
        },
        include: { pack: { select: { name: true } } },
      });
      return this.toView(updated);
    } catch (err) {
      await this.prisma.platformSignup.update({
        where: { id: signup.id },
        data: {
          status: PlatformSignupStatus.FAILED,
          lastError:
            err instanceof Error ? err.message.slice(0, 500) : 'MP error',
        },
      });
      throw new BadRequestException(
        err instanceof Error ? err.message : 'No se pudo crear el checkout MP',
      );
    }
  }

  /**
   * Estado del intento (dueño).
   */
  async getMine(
    identityId: string,
    signupId: string,
  ): Promise<PlatformSignupView> {
    const row = await this.prisma.platformSignup.findFirst({
      where: { id: signupId, identityId },
      include: {
        pack: { select: { name: true } },
        tenant: { select: { slug: true } },
      },
    });
    if (!row) {
      throw new NotFoundException(`Signup ${signupId} not found`);
    }
    return this.toView(row);
  }

  /**
   * Webhook `subscription_preapproval`.
   */
  async handlePreapproval(
    tenantId: string,
    preapprovalId: string,
  ): Promise<MpWebhookProcessResult> {
    const admin = await this.requireAdminTenant();
    if (admin.id !== tenantId) {
      return this.emptyWebhook(null);
    }
    const accessToken = await this.accounts.getDecryptedAccessToken(tenantId);
    const remote = await this.mp.getPreapproval(accessToken, preapprovalId);
    const signup = await this.findSignup(remote.externalReference, remote.id);
    if (!signup) {
      return {
        handled: false,
        transactionItemId: null,
        transactionId: null,
        status: remote.status,
        contractId: null,
        reservationId: null,
      };
    }
    await this.applyPreapproval(signup, remote, admin.id);
    return this.emptyWebhook(remote.status);
  }

  /**
   * Cada hora: consulta en MP los intentos abiertos (por si el webhook no
   * llegó) y vence los PENDING que pasaron 1 h sin autorizar.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async reconcilePendingSignups(): Promise<void> {
    const rows = await this.prisma.platformSignup.findMany({
      where: { status: { in: OPEN_SIGNUP_STATUSES } },
    });
    for (const signup of rows) {
      const authorized = await this.reconcileSafely(signup);
      if (
        !authorized &&
        signup.status === PlatformSignupStatus.PENDING &&
        isStale(signup)
      ) {
        await this.expire(signup, 'Vencido: no se autorizó en Mercado Pago');
      }
    }
  }

  /**
   * Libera el slug de intentos abiertos que ya no cuentan: los PENDING del
   * mismo dueño (reintento) o vencidos de cualquiera.
   *
   * @remarks Antes de descartar, consulta MP: si ya estaba autorizado, se
   * procesa (y el slug queda tomado de verdad).
   */
  private async releaseSlug(slug: string, identityId: string): Promise<void> {
    const open = await this.prisma.platformSignup.findMany({
      where: { slug, status: PlatformSignupStatus.PENDING },
    });
    for (const signup of open) {
      if (signup.identityId !== identityId && !isStale(signup)) {
        continue;
      }
      const authorized = await this.reconcileSafely(signup);
      if (!authorized) {
        await this.expire(
          signup,
          signup.identityId === identityId
            ? 'Reemplazado por un intento nuevo'
            : 'Vencido: no se autorizó en Mercado Pago',
        );
      }
    }
  }

  /**
   * Consulta el preapproval en MP y aplica su estado. Sin prueba, además
   * busca el primer cobro aprobado para que nazca el gym.
   *
   * @returns true si MP ya lo tiene autorizado. Nunca lanza.
   */
  private async reconcileSafely(signup: PlatformSignup): Promise<boolean> {
    if (!signup.mpPreapprovalId) {
      return false;
    }
    try {
      const admin = await this.requireAdminTenant();
      const accessToken = await this.accounts.getDecryptedAccessToken(admin.id);
      const remote = await this.mp.getPreapproval(
        accessToken,
        signup.mpPreapprovalId,
      );
      await this.applyPreapproval(signup, remote, admin.id);
      const authorized = isAuthorized(remote.status);
      if (
        authorized &&
        !signup.applyTrial &&
        (await this.mp.hasApprovedAuthorizedPayment(
          accessToken,
          signup.mpPreapprovalId,
        ))
      ) {
        await this.fulfill(signup.id);
      }
      return authorized;
    } catch (err) {
      this.logger.warn(
        `Reconcile signup ${signup.id}: ${err instanceof Error ? err.message : String(err)}`,
      );
      return false;
    }
  }

  /**
   * Marca el intento como fallido (libera el slug) y cancela el preapproval
   * en MP para que nunca se cobre.
   */
  private async expire(signup: PlatformSignup, reason: string): Promise<void> {
    const released = await this.prisma.platformSignup.updateMany({
      where: { id: signup.id, status: PlatformSignupStatus.PENDING },
      data: { status: PlatformSignupStatus.FAILED, lastError: reason },
    });
    if (released.count === 0 || !signup.mpPreapprovalId) {
      return;
    }
    try {
      const admin = await this.requireAdminTenant();
      const accessToken = await this.accounts.getDecryptedAccessToken(admin.id);
      await this.mp.cancelPreapproval(accessToken, signup.mpPreapprovalId);
    } catch (err) {
      this.logger.warn(
        `Cancel preapproval signup ${signup.id}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /**
   * Aplica el estado remoto del preapproval (webhook o consulta directa).
   */
  private async applyPreapproval(
    signup: PlatformSignup,
    remote: MpRemotePreapproval,
    adminTenantId: string,
  ): Promise<void> {
    if (!isAuthorized(remote.status)) {
      const failed =
        remote.status === 'cancelled' ||
        remote.status === 'paused' ||
        remote.status === 'rejected';
      if (failed && signup.status !== PlatformSignupStatus.FAILED) {
        const pack = await this.prisma.pack.findUnique({
          where: { id: signup.packId },
          select: { name: true },
        });
        await this.notifications.notifyPlatformOwner({
          tenantId: signup.tenantId ?? adminTenantId,
          identityId: signup.identityId,
          event: NotificationEventCode.PLATFORM_DEBIT_MANDATE_FAILED,
          idempotencyKey: `PLATFORM_DEBIT_MANDATE_FAILED:${signup.id}`,
          extraVars: {
            pack: pack?.name ?? 'Faciliter',
            gym: signup.gymName,
          },
          payload: { signupId: signup.id, status: remote.status },
        });
      }
      return;
    }
    if (signup.applyTrial) {
      await this.fulfill(signup.id);
    } else if (signup.status === PlatformSignupStatus.PENDING) {
      await this.prisma.platformSignup.update({
        where: { id: signup.id },
        data: { status: PlatformSignupStatus.AWAITING_PAYMENT },
      });
    }
  }

  /**
   * Webhook `subscription_authorized_payment` o pago MP con external_reference = signup.
   */
  async handlePaidSignup(
    tenantId: string,
    signupId: string,
  ): Promise<MpWebhookProcessResult> {
    const admin = await this.requireAdminTenant();
    if (admin.id !== tenantId) {
      return this.emptyWebhook(null);
    }
    const signup = await this.prisma.platformSignup.findUnique({
      where: { id: signupId },
    });
    if (!signup) {
      return this.emptyWebhook(null);
    }
    if (!signup.applyTrial) {
      await this.fulfill(signup.id);
    }
    return this.emptyWebhook('approved');
  }

  /**
   * Crea el gym + contrato TENANT (idempotente).
   */
  async fulfill(signupId: string): Promise<void> {
    const signup = await this.prisma.platformSignup.findUnique({
      where: { id: signupId },
    });
    if (!signup || signup.status === PlatformSignupStatus.COMPLETED) {
      return;
    }
    if (signup.status === PlatformSignupStatus.FAILED) {
      return;
    }

    const admin = await this.requireAdminTenant();
    let tenantId = signup.tenantId;
    try {
      if (!tenantId) {
        const provisioned = await this.tenants.provisionFromIdentity(
          signup.identityId,
          { name: signup.gymName, slug: signup.slug },
        );
        tenantId = provisioned.tenantId;
      }

      await this.cash.startTenantCashCart(
        admin.id,
        tenantId,
        { profileType: 'IDENTITY', userId: signup.identityId },
        {
          items: [{ kind: 'PACK', id: signup.packId, quantity: 1 }],
          applyTrial: signup.applyTrial,
          idempotencyKey: `platform-signup-${signup.id}`,
        },
      );

      await this.prisma.platformSignup.update({
        where: { id: signup.id },
        data: {
          tenantId,
          status: PlatformSignupStatus.COMPLETED,
          lastError: null,
        },
      });
    } catch (err) {
      this.logger.warn(
        `Fulfill signup ${signup.id}: ${err instanceof Error ? err.message : String(err)}`,
      );
      const current = await this.prisma.platformSignup.findUnique({
        where: { id: signup.id },
        select: { status: true },
      });
      if (current?.status === PlatformSignupStatus.COMPLETED) {
        return;
      }
      await this.prisma.platformSignup.update({
        where: { id: signup.id },
        data: {
          status: PlatformSignupStatus.FAILED,
          lastError:
            err instanceof Error ? err.message.slice(0, 500) : 'fulfill',
        },
      });
      throw err;
    }
  }

  private async findSignup(
    externalReference: string | null,
    preapprovalId: string,
  ) {
    if (externalReference) {
      const byId = await this.prisma.platformSignup.findUnique({
        where: { id: externalReference },
      });
      if (byId) {
        return byId;
      }
    }
    return this.prisma.platformSignup.findUnique({
      where: { mpPreapprovalId: preapprovalId },
    });
  }

  private async requireAdminTenant(): Promise<{ id: string }> {
    const admin = await this.prisma.tenant.findUnique({
      where: { slug: PLATFORM_ADMIN_SLUG },
      select: { id: true },
    });
    if (!admin) {
      throw new BadRequestException('Tenant de plataforma no configurado');
    }
    return admin;
  }

  private notificationUrl(adminTenantId: string): string {
    const publicBase =
      this.config.get<string>('PUBLIC_API_BASE_URL')?.replace(/\/$/, '') ||
      'http://localhost:3001';
    return `${publicBase}/api/webhooks/payment?tenantId=${adminTenantId}`;
  }

  private webBackUrl(): string {
    const web =
      this.config.get<string>('PUBLIC_WEB_BASE_URL')?.replace(/\/$/, '') ||
      'http://localhost:3002';
    return `${web}/cuenta`;
  }

  private toView(row: {
    id: string;
    gymName: string;
    slug: string;
    packId: string;
    applyTrial: boolean;
    status: PlatformSignupStatus;
    initPoint: string | null;
    tenantId: string | null;
    pack: { name: string };
    tenant?: { slug: string } | null;
  }): PlatformSignupView {
    return {
      id: row.id,
      gymName: row.gymName,
      slug: row.slug,
      packId: row.packId,
      packName: row.pack.name,
      applyTrial: row.applyTrial,
      status: row.status,
      checkoutUrl: row.initPoint,
      tenantId: row.tenantId,
      tenantSlug: row.tenant?.slug ?? (row.tenantId ? row.slug : null),
    };
  }

  private emptyWebhook(status: string | null): MpWebhookProcessResult {
    return {
      handled: Boolean(status),
      transactionItemId: null,
      transactionId: null,
      status,
      contractId: null,
      reservationId: null,
    };
  }
}

function isAuthorized(status: string): boolean {
  return status === 'authorized' || status === 'active';
}

function isStale(signup: PlatformSignup): boolean {
  return signup.createdAt.getTime() < Date.now() - PENDING_SIGNUP_TTL_MS;
}
