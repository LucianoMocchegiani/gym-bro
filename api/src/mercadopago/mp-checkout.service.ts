import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  MemberStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  SessionStatus,
} from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { TenantSettingsService } from '../tenant-settings/tenant-settings.service';
import { CreateMpCheckoutDto } from './dto/create-mp-checkout.dto';
import { CreateMpDropInCheckoutDto } from './dto/create-mp-drop-in-checkout.dto';
import { MercadoPagoAccountService } from './mercadopago-account.service';
import { MP_ACCOUNT_PORT, MpAccountPort } from './mp-account.port';
import { MpCheckoutResult } from './mp-checkout.types';

/**
 * Checkout Mercado Pago: pack y drop-in (CU-PAG-001 / CU-RES-001 / RN-PAG-004).
 *
 * @remarks Crea Payment PENDING + Preference. Derechos al webhook APPROVED.
 */
@Injectable()
export class MpCheckoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accounts: MercadoPagoAccountService,
    private readonly tenantSettings: TenantSettingsService,
    private readonly config: ConfigService,
    @Inject(MP_ACCOUNT_PORT) private readonly mp: MpAccountPort,
  ) {}

  /**
   * Inicia o reutiliza checkout de pack para el afiliado.
   */
  async startPackCheckout(
    tenantId: string,
    memberId: string,
    dto: CreateMpCheckoutDto,
  ): Promise<MpCheckoutResult> {
    const member = await this.requireActiveMember(tenantId, memberId);
    await this.requireMpConnected(tenantId);

    const pack = await this.prisma.pack.findFirst({
      where: { id: dto.packId, tenantId },
      include: { components: true },
    });
    if (!pack) {
      throw new NotFoundException(`Pack ${dto.packId} not found in tenant`);
    }
    if (!pack.active) {
      throw new BadRequestException('Pack is inactive');
    }
    if (pack.components.length === 0) {
      throw new BadRequestException('Pack has no components');
    }
    if (pack.price < 1) {
      throw new BadRequestException('Pack price must be at least 1');
    }

    const idempotencyKey =
      dto.idempotencyKey?.trim() || `mp-${randomBytes(16).toString('hex')}`;

    const existing = await this.prisma.payment.findUnique({
      where: {
        tenantId_idempotencyKey: { tenantId, idempotencyKey },
      },
      include: {
        contract: { select: { id: true } },
        reservation: { select: { id: true } },
      },
    });

    if (existing) {
      this.assertSameMpCheckout(existing, {
        memberId,
        packId: pack.id,
        sessionId: null,
      });
      if (this.isTerminalOrHasPreference(existing)) {
        return this.toResult(existing);
      }
    }

    return this.createPreferencePayment({
      tenantId,
      memberId,
      memberEmail: member.email,
      idempotencyKey,
      existing,
      amount: pack.price,
      title: pack.name,
      packId: pack.id,
      sessionId: null,
    });
  }

  /**
   * Inicia o reutiliza checkout drop-in para una sesión.
   *
   * @remarks No reserva cupo hasta APPROVED (webhook).
   */
  async startDropInCheckout(
    tenantId: string,
    memberId: string,
    dto: CreateMpDropInCheckoutDto,
  ): Promise<MpCheckoutResult> {
    const member = await this.requireActiveMember(tenantId, memberId);
    await this.requireMpConnected(tenantId);

    const session = await this.prisma.session.findFirst({
      where: { id: dto.sessionId, tenantId },
      select: {
        id: true,
        status: true,
        startsAt: true,
        endsAt: true,
        capacity: true,
        bookedCount: true,
        service: {
          select: {
            name: true,
            active: true,
            dropInPrice: true,
          },
        },
      },
    });
    if (!session) {
      throw new NotFoundException(
        `Session ${dto.sessionId} not found in tenant`,
      );
    }
    if (session.status !== SessionStatus.PUBLISHED) {
      throw new BadRequestException('Session is not published');
    }
    if (!session.service.active) {
      throw new BadRequestException('Service is inactive');
    }
    if (
      session.service.dropInPrice === null ||
      session.service.dropInPrice < 1
    ) {
      throw new BadRequestException(
        'Drop-in is not enabled for this service (set dropInPrice)',
      );
    }
    await this.tenantSettings.assertSessionOpenForBooking(tenantId, session);
    if (session.bookedCount >= session.capacity) {
      throw new BadRequestException('Session is full');
    }

    const idempotencyKey =
      dto.idempotencyKey?.trim() ||
      `mp-dropin-${randomBytes(16).toString('hex')}`;

    const existing = await this.prisma.payment.findUnique({
      where: {
        tenantId_idempotencyKey: { tenantId, idempotencyKey },
      },
      include: {
        contract: { select: { id: true } },
        reservation: { select: { id: true } },
      },
    });

    if (existing) {
      this.assertSameMpCheckout(existing, {
        memberId,
        packId: null,
        sessionId: session.id,
      });
      if (this.isTerminalOrHasPreference(existing)) {
        return this.toResult(existing);
      }
    }

    return this.createPreferencePayment({
      tenantId,
      memberId,
      memberEmail: member.email,
      idempotencyKey,
      existing,
      amount: session.service.dropInPrice,
      title: `Drop-in: ${session.service.name}`,
      packId: null,
      sessionId: session.id,
    });
  }

  private async requireActiveMember(tenantId: string, memberId: string) {
    const member = await this.prisma.member.findFirst({
      where: { id: memberId, tenantId },
      select: { id: true, status: true, email: true },
    });
    if (!member) {
      throw new NotFoundException(`Member ${memberId} not found in tenant`);
    }
    if (member.status !== MemberStatus.ACTIVE) {
      throw new BadRequestException('Member must be ACTIVE to checkout');
    }
    return member;
  }

  private async requireMpConnected(tenantId: string): Promise<void> {
    const account = await this.accounts.getStatus(tenantId);
    if (!account.connected) {
      throw new BadRequestException('Mercado Pago account is not connected');
    }
  }

  private assertSameMpCheckout(
    existing: {
      method: PaymentMethod;
      memberId: string;
      packId: string | null;
      sessionId: string | null;
    },
    expected: {
      memberId: string;
      packId: string | null;
      sessionId: string | null;
    },
  ): void {
    if (existing.method !== PaymentMethod.MP) {
      throw new BadRequestException(
        'Idempotency key already used for a non-MP payment',
      );
    }
    if (
      existing.memberId !== expected.memberId ||
      existing.packId !== expected.packId ||
      existing.sessionId !== expected.sessionId
    ) {
      throw new BadRequestException(
        'Idempotency key already used for a different checkout',
      );
    }
  }

  private isTerminalOrHasPreference(existing: {
    status: PaymentStatus;
    mpPreferenceId: string | null;
  }): boolean {
    if (
      existing.status === PaymentStatus.APPROVED ||
      existing.status === PaymentStatus.REJECTED ||
      existing.status === PaymentStatus.REFUNDED
    ) {
      return true;
    }
    return Boolean(existing.mpPreferenceId);
  }

  private async createPreferencePayment(input: {
    tenantId: string;
    memberId: string;
    memberEmail: string;
    idempotencyKey: string;
    existing: {
      id: string;
      status: PaymentStatus;
      amount: number;
      packId: string | null;
      sessionId: string | null;
      idempotencyKey: string;
      mpPreferenceId: string | null;
      mpInitPoint: string | null;
      mpSandboxInitPoint: string | null;
      contract: { id: string } | null;
      reservation: { id: string } | null;
    } | null;
    amount: number;
    title: string;
    packId: string | null;
    sessionId: string | null;
  }): Promise<MpCheckoutResult> {
    const accessToken = await this.accounts.getDecryptedAccessToken(
      input.tenantId,
    );
    const publicBase =
      this.config.get<string>('PUBLIC_API_BASE_URL')?.replace(/\/$/, '') ||
      'http://localhost:3001';
    const notificationUrl = `${publicBase}/api/webhooks/mercadopago?tenantId=${input.tenantId}`;

    try {
      const payment =
        input.existing ??
        (await this.prisma.payment.create({
          data: {
            tenantId: input.tenantId,
            memberId: input.memberId,
            packId: input.packId,
            sessionId: input.sessionId,
            amount: input.amount,
            status: PaymentStatus.PENDING,
            method: PaymentMethod.MP,
            idempotencyKey: input.idempotencyKey,
          },
          include: {
            contract: { select: { id: true } },
            reservation: { select: { id: true } },
          },
        }));

      const preference = await this.mp.createPreference({
        accessToken,
        title: input.title,
        amount: input.amount,
        externalReference: payment.id,
        notificationUrl,
        payerEmail: input.memberEmail,
      });

      const updated = await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          mpPreferenceId: preference.preferenceId,
          mpInitPoint: preference.initPoint,
          mpSandboxInitPoint: preference.sandboxInitPoint,
        },
        include: {
          contract: { select: { id: true } },
          reservation: { select: { id: true } },
        },
      });

      return this.toResult(updated);
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const again = await this.prisma.payment.findUnique({
          where: {
            tenantId_idempotencyKey: {
              tenantId: input.tenantId,
              idempotencyKey: input.idempotencyKey,
            },
          },
          include: {
            contract: { select: { id: true } },
            reservation: { select: { id: true } },
          },
        });
        if (again) {
          return this.toResult(again);
        }
      }
      if (error instanceof Error && error.message.includes('Mercado Pago')) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  private toResult(payment: {
    id: string;
    status: PaymentStatus;
    amount: number;
    packId: string | null;
    sessionId: string | null;
    idempotencyKey: string;
    mpPreferenceId: string | null;
    mpInitPoint?: string | null;
    mpSandboxInitPoint?: string | null;
    contract?: { id: string } | null;
    reservation?: { id: string } | null;
  }): MpCheckoutResult {
    const kind = payment.sessionId ? 'DROP_IN' : 'PACK';
    return {
      paymentId: payment.id,
      status: payment.status,
      amount: payment.amount,
      kind,
      packId: payment.packId,
      sessionId: payment.sessionId,
      idempotencyKey: payment.idempotencyKey,
      mpPreferenceId: payment.mpPreferenceId,
      checkoutUrl: payment.mpInitPoint ?? null,
      sandboxCheckoutUrl: payment.mpSandboxInitPoint ?? null,
      contractId: payment.contract?.id ?? null,
      reservationId: payment.reservation?.id ?? null,
    };
  }
}
