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
} from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { MercadoPagoAccountService } from './mercadopago-account.service';
import { MP_ACCOUNT_PORT, MpAccountPort } from './mp-account.port';
import { CreateMpCheckoutDto } from './dto/create-mp-checkout.dto';
import { MpCheckoutResult } from './mp-checkout.types';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Checkout Mercado Pago para packs (CU-PAG-001 / RN-PAG-004 / RN-PAG-005).
 *
 * @remarks Crea Payment PENDING + Preference en la cuenta del gym.
 * Derechos se confirman en el webhook.
 */
@Injectable()
export class MpCheckoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accounts: MercadoPagoAccountService,
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

    const account = await this.accounts.getStatus(tenantId);
    if (!account.connected) {
      throw new BadRequestException('Mercado Pago account is not connected');
    }

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
      include: { contract: { select: { id: true } } },
    });

    if (existing) {
      if (existing.method !== PaymentMethod.MP) {
        throw new BadRequestException(
          'Idempotency key already used for a non-MP payment',
        );
      }
      if (existing.memberId !== memberId || existing.packId !== pack.id) {
        throw new BadRequestException(
          'Idempotency key already used for a different checkout',
        );
      }
      if (
        existing.status === PaymentStatus.APPROVED ||
        existing.status === PaymentStatus.REJECTED ||
        existing.status === PaymentStatus.REFUNDED
      ) {
        return this.toResult(existing, existing.contract?.id ?? null);
      }
      if (existing.mpPreferenceId) {
        return this.toResult(existing, existing.contract?.id ?? null);
      }
    }

    const accessToken = await this.accounts.getDecryptedAccessToken(tenantId);
    const publicBase =
      this.config.get<string>('PUBLIC_API_BASE_URL')?.replace(/\/$/, '') ||
      'http://localhost:3001';
    const notificationUrl = `${publicBase}/api/webhooks/mercadopago?tenantId=${tenantId}`;

    try {
      const payment =
        existing ??
        (await this.prisma.payment.create({
          data: {
            tenantId,
            memberId,
            packId: pack.id,
            amount: pack.price,
            status: PaymentStatus.PENDING,
            method: PaymentMethod.MP,
            idempotencyKey,
          },
        }));

      const preference = await this.mp.createPreference({
        accessToken,
        title: pack.name,
        amount: pack.price,
        externalReference: payment.id,
        notificationUrl,
        payerEmail: member.email,
      });

      const updated = await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          mpPreferenceId: preference.preferenceId,
          mpInitPoint: preference.initPoint,
          mpSandboxInitPoint: preference.sandboxInitPoint,
        },
        include: { contract: { select: { id: true } } },
      });

      return this.toResult(updated, updated.contract?.id ?? null);
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const again = await this.prisma.payment.findUnique({
          where: {
            tenantId_idempotencyKey: { tenantId, idempotencyKey },
          },
          include: { contract: { select: { id: true } } },
        });
        if (again) {
          return this.toResult(again, again.contract?.id ?? null);
        }
      }
      if (error instanceof Error && error.message.includes('Mercado Pago')) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  private toResult(
    payment: {
      id: string;
      status: PaymentStatus;
      amount: number;
      packId: string | null;
      idempotencyKey: string;
      mpPreferenceId: string | null;
      mpInitPoint?: string | null;
      mpSandboxInitPoint?: string | null;
    },
    contractId: string | null,
  ): MpCheckoutResult {
    return {
      paymentId: payment.id,
      status: payment.status,
      amount: payment.amount,
      packId: payment.packId!,
      idempotencyKey: payment.idempotencyKey,
      mpPreferenceId: payment.mpPreferenceId,
      checkoutUrl: payment.mpInitPoint ?? null,
      sandboxCheckoutUrl: payment.mpSandboxInitPoint ?? null,
      contractId,
    };
  }
}
