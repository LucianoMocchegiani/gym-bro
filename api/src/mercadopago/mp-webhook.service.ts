import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentMethod, PaymentStatus } from '@prisma/client';
import { ContractsService } from '../contracts/contracts.service';
import { PrismaService } from '../prisma/prisma.service';
import { ReservationsService } from '../reservations/reservations.service';
import { SimulateMpWebhookDto } from './dto/simulate-mp-webhook.dto';
import { MercadoPagoAccountService } from './mercadopago-account.service';
import { MP_ACCOUNT_PORT, MpAccountPort } from './mp-account.port';
import { MpWebhookProcessResult } from './mp-checkout.types';

/**
 * Webhook Mercado Pago idempotente (CU-PAG-001 / CU-RES-001 / RN-PAG-005).
 *
 * @remarks Pack → contrato; drop-in (`sessionId`) → reserva. Simulate solo stub.
 */
@Injectable()
export class MpWebhookService {
  private readonly logger = new Logger(MpWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly accounts: MercadoPagoAccountService,
    private readonly contracts: ContractsService,
    private readonly reservations: ReservationsService,
    private readonly config: ConfigService,
    @Inject(MP_ACCOUNT_PORT) private readonly mp: MpAccountPort,
  ) {}

  /**
   * Procesa notificación MP (payment topic).
   */
  async handleNotification(
    tenantId: string,
    payload: {
      type?: string;
      action?: string;
      data?: { id?: string | number };
      topic?: string;
      id?: string | number;
    },
    query: { topic?: string; id?: string },
  ): Promise<MpWebhookProcessResult> {
    const mpPaymentId = this.extractMpPaymentId(payload, query);
    if (!mpPaymentId) {
      return {
        handled: false,
        paymentId: null,
        status: null,
        contractId: null,
        reservationId: null,
      };
    }

    const accessToken = await this.accounts.getDecryptedAccessToken(tenantId);
    let remote;
    try {
      remote = await this.mp.getPayment(accessToken, mpPaymentId);
    } catch (err) {
      this.logger.warn(
        `MP webhook fetch failed tenant=${tenantId} mpPaymentId=${mpPaymentId}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      throw new ServiceUnavailableException(
        'Could not fetch Mercado Pago payment',
      );
    }

    const paymentId = remote.externalReference;
    if (!paymentId) {
      return {
        handled: false,
        paymentId: null,
        status: remote.status,
        contractId: null,
        reservationId: null,
      };
    }

    return this.applyRemoteStatus(
      tenantId,
      paymentId,
      mpPaymentId,
      remote.status,
    );
  }

  /**
   * Simula aprobación/rechazo sin llamar a MP (solo stub).
   */
  async simulate(dto: SimulateMpWebhookDto): Promise<MpWebhookProcessResult> {
    if (!this.isCheckoutStub()) {
      throw new BadRequestException(
        'Webhook simulate is only available when MP_CHECKOUT_MODE=stub',
      );
    }

    const payment = await this.prisma.payment.findUnique({
      where: { id: dto.paymentId },
    });
    if (!payment) {
      throw new NotFoundException(`Payment ${dto.paymentId} not found`);
    }
    if (payment.method !== PaymentMethod.MP) {
      throw new BadRequestException('Payment is not an MP checkout');
    }

    const mpPaymentId =
      payment.mpPaymentId ??
      `stub-pay-${payment.id.replace(/-/g, '').slice(0, 16)}`;

    return this.applyRemoteStatus(
      payment.tenantId,
      payment.id,
      mpPaymentId,
      dto.status === 'APPROVED' ? 'approved' : 'rejected',
    );
  }

  private async applyRemoteStatus(
    tenantId: string,
    paymentId: string,
    mpPaymentId: string,
    remoteStatus: string,
  ): Promise<MpWebhookProcessResult> {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, tenantId },
      include: {
        contract: { select: { id: true } },
        reservation: { select: { id: true } },
      },
    });
    if (!payment) {
      throw new NotFoundException(`Payment ${paymentId} not found in tenant`);
    }
    if (payment.method !== PaymentMethod.MP) {
      throw new BadRequestException('Payment is not an MP checkout');
    }

    if (
      payment.mpPaymentId &&
      payment.mpPaymentId !== mpPaymentId &&
      payment.status !== PaymentStatus.PENDING
    ) {
      this.logger.warn(
        `Ignoring webhook with different mpPaymentId for payment ${paymentId}`,
      );
      return {
        handled: true,
        paymentId: payment.id,
        status: payment.status,
        contractId: payment.contract?.id ?? null,
        reservationId: payment.reservation?.id ?? null,
      };
    }

    const mapped = this.mapMpStatus(remoteStatus);
    if (!mapped) {
      return {
        handled: false,
        paymentId: payment.id,
        status: remoteStatus,
        contractId: payment.contract?.id ?? null,
        reservationId: payment.reservation?.id ?? null,
      };
    }

    if (
      payment.status === PaymentStatus.APPROVED ||
      payment.status === PaymentStatus.REJECTED ||
      payment.status === PaymentStatus.REFUNDED
    ) {
      if (payment.status === PaymentStatus.APPROVED) {
        return this.ensureRights(tenantId, payment);
      }
      return {
        handled: true,
        paymentId: payment.id,
        status: payment.status,
        contractId: payment.contract?.id ?? null,
        reservationId: payment.reservation?.id ?? null,
      };
    }

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: mapped,
        mpPaymentId,
      },
    });

    if (mapped === PaymentStatus.APPROVED) {
      const refreshed = await this.prisma.payment.findFirstOrThrow({
        where: { id: payment.id, tenantId },
        include: {
          contract: { select: { id: true } },
          reservation: { select: { id: true } },
        },
      });
      return this.ensureRights(tenantId, refreshed);
    }

    return {
      handled: true,
      paymentId: payment.id,
      status: mapped,
      contractId: null,
      reservationId: null,
    };
  }

  private async ensureRights(
    tenantId: string,
    payment: {
      id: string;
      memberId: string;
      status: PaymentStatus;
      sessionId: string | null;
      packId: string | null;
      contract: { id: string } | null;
      reservation: { id: string } | null;
    },
  ): Promise<MpWebhookProcessResult> {
    const actor = {
      profileType: 'MEMBER' as const,
      userId: payment.memberId,
    };

    if (payment.sessionId) {
      if (payment.reservation) {
        return {
          handled: true,
          paymentId: payment.id,
          status: payment.status,
          contractId: null,
          reservationId: payment.reservation.id,
        };
      }
      const reservation =
        await this.reservations.confirmDropInFromApprovedPayment(
          tenantId,
          payment.id,
          actor,
        );
      return {
        handled: true,
        paymentId: payment.id,
        status: payment.status,
        contractId: null,
        reservationId: reservation.id,
      };
    }

    if (payment.contract) {
      return {
        handled: true,
        paymentId: payment.id,
        status: payment.status,
        contractId: payment.contract.id,
        reservationId: null,
      };
    }

    const contract = await this.contracts.confirmFromApprovedPayment(
      tenantId,
      payment.id,
      actor,
    );
    return {
      handled: true,
      paymentId: payment.id,
      status: payment.status,
      contractId: contract.id,
      reservationId: null,
    };
  }

  private mapMpStatus(status: string): PaymentStatus | null {
    const normalized = status.trim().toLowerCase();
    if (normalized === 'approved') {
      return PaymentStatus.APPROVED;
    }
    if (
      normalized === 'rejected' ||
      normalized === 'cancelled' ||
      normalized === 'canceled'
    ) {
      return PaymentStatus.REJECTED;
    }
    return null;
  }

  private extractMpPaymentId(
    payload: {
      type?: string;
      action?: string;
      data?: { id?: string | number };
      topic?: string;
      id?: string | number;
    },
    query: { topic?: string; id?: string },
  ): string | null {
    const fromData = payload.data?.id;
    if (fromData !== undefined && fromData !== null) {
      return String(fromData);
    }
    if (payload.id !== undefined && payload.id !== null) {
      return String(payload.id);
    }
    if (query.id) {
      return query.id;
    }
    return null;
  }

  private isCheckoutStub(): boolean {
    const mode =
      this.config.get<string>('MP_CHECKOUT_MODE')?.trim() ??
      this.config.get<string>('MP_ACCOUNT_VALIDATE_MODE')?.trim() ??
      'live';
    return mode === 'stub';
  }
}
