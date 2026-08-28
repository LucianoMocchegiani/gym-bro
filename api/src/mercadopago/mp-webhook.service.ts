import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CartCheckout, PaymentMethod, PaymentStatus } from '@prisma/client';
import { ContractsService } from '../contracts/contracts.service';
import { PrismaService } from '../prisma/prisma.service';
import { ReservationsService } from '../reservations/reservations.service';
import { MercadoPagoAccountService } from './mercadopago-account.service';
import { MP_ACCOUNT_PORT, MpAccountPort } from './mp-account.port';
import { MpWebhookProcessResult } from './mp-checkout.types';

/**
 * Webhook Mercado Pago idempotente (CU-PAG-001 / CU-RES-001 / RN-PAG-005).
 *
 * @remarks Pack → contrato; drop-in (`sessionId`) → reserva; carrito MP
 * (externalReference = cartId) → confirma cada payment al APPROVED.
 * Simulate solo stub.
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
   * Procesa notificación MP (payment o merchant_order topic).
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
    const type = payload.type ?? query.topic;
    const dataId = payload.data?.id ?? query.id;

    this.logger.log(
      `MP webhook tenant=${tenantId} type=${type} action=${payload.action} dataId=${dataId}`,
    );

    if (type === 'merchant_order' && dataId) {
      return this.handleMerchantOrder(tenantId, String(dataId));
    }

    const mpPaymentId = this.extractMpPaymentId(payload, query);
    if (!mpPaymentId) {
      return {
        handled: false,
        paymentId: null,
        cartId: null,
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

    const refId = remote.externalReference;
    if (!refId) {
      return {
        handled: false,
        paymentId: null,
        cartId: null,
        status: remote.status,
        contractId: null,
        reservationId: null,
      };
    }

    return this.applyRemoteStatus(tenantId, refId, mpPaymentId, remote.status);
  }

  /**
   * Procesa notificación de tipo merchant_order.
   *
   * @remarks MP envía `type=merchant_order` con `data.id` = merchant_order id.
   * Consultamos la orden y procesamos cada pago aprobado.
   */
  private async handleMerchantOrder(
    tenantId: string,
    merchantOrderId: string,
  ): Promise<MpWebhookProcessResult> {
    const accessToken = await this.accounts.getDecryptedAccessToken(tenantId);
    let mo;
    try {
      mo = await this.mp.getMerchantOrder(accessToken, merchantOrderId);
    } catch (err) {
      this.logger.warn(
        `MP merchant_order fetch failed tenant=${tenantId} moId=${merchantOrderId}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      throw new ServiceUnavailableException(
        'Could not fetch Mercado Pago merchant_order',
      );
    }

    if (!mo.payments.length) {
      return {
        handled: false,
        paymentId: null,
        cartId: null,
        status: mo.status,
        contractId: null,
        reservationId: null,
      };
    }

    const approved = mo.payments.find((p) => p.status === 'approved');
    if (!approved) {
      const first = mo.payments[0];
      return {
        handled: false,
        paymentId: null,
        cartId: null,
        status: first?.status ?? mo.status,
        contractId: null,
        reservationId: null,
      };
    }

    const refId = mo.externalReference;
    if (!refId) {
      return {
        handled: false,
        paymentId: null,
        cartId: null,
        status: approved.status,
        contractId: null,
        reservationId: null,
      };
    }

    return this.applyRemoteStatus(
      tenantId,
      refId,
      approved.id,
      approved.status,
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
      const cart = await this.prisma.cartCheckout.findFirst({
        where: { id: paymentId, tenantId },
      });
      if (cart) {
        return this.applyRemoteStatusCart(
          tenantId,
          cart.id,
          mpPaymentId,
          remoteStatus,
        );
      }
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
        cartId: null,
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
        cartId: null,
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
        cartId: null,
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
      cartId: null,
      status: mapped,
      contractId: null,
      reservationId: null,
    };
  }

  private async applyRemoteStatusCart(
    tenantId: string,
    cartId: string,
    mpPaymentId: string,
    remoteStatus: string,
  ): Promise<MpWebhookProcessResult> {
    const cart = await this.prisma.cartCheckout.findFirst({
      where: { id: cartId, tenantId },
      include: {
        payments: {
          include: {
            contract: { select: { id: true } },
            reservation: { select: { id: true } },
          },
        },
      },
    });
    if (!cart) {
      throw new NotFoundException(`Cart ${cartId} not found in tenant`);
    }

    if (
      cart.mpPaymentId &&
      cart.mpPaymentId !== mpPaymentId &&
      cart.status !== PaymentStatus.PENDING
    ) {
      this.logger.warn(
        `Ignoring webhook with different mpPaymentId for cart ${cartId}`,
      );
      return {
        handled: true,
        paymentId: cart.id,
        cartId: cart.id,
        status: cart.status,
        contractId: null,
        reservationId: null,
      };
    }

    const mapped = this.mapMpStatus(remoteStatus);
    if (!mapped) {
      return {
        handled: false,
        paymentId: cart.id,
        cartId: cart.id,
        status: remoteStatus,
        contractId: null,
        reservationId: null,
      };
    }

    if (
      cart.status === PaymentStatus.APPROVED ||
      cart.status === PaymentStatus.REJECTED ||
      cart.status === PaymentStatus.REFUNDED
    ) {
      if (cart.status === PaymentStatus.APPROVED) {
        return this.ensureCartRights(tenantId, cart);
      }
      return {
        handled: true,
        paymentId: cart.id,
        cartId: cart.id,
        status: cart.status,
        contractId: null,
        reservationId: null,
      };
    }

    await this.prisma.cartCheckout.update({
      where: { id: cart.id },
      data: { status: mapped, mpPaymentId },
    });

    if (mapped === PaymentStatus.APPROVED) {
      await this.prisma.payment.updateMany({
        where: { cartId: cart.id },
        data: { status: PaymentStatus.APPROVED },
      });
      const refreshed = await this.prisma.cartCheckout.findFirstOrThrow({
        where: { id: cart.id, tenantId },
        include: {
          payments: {
            include: {
              contract: { select: { id: true } },
              reservation: { select: { id: true } },
            },
          },
        },
      });
      return this.ensureCartRights(tenantId, refreshed);
    }

    await this.prisma.payment.updateMany({
      where: { cartId: cart.id },
      data: { status: PaymentStatus.REJECTED },
    });
    return {
      handled: true,
      paymentId: cart.id,
      cartId: cart.id,
      status: mapped,
      contractId: null,
      reservationId: null,
    };
  }

  private async ensureCartRights(
    tenantId: string,
    cart: CartCheckout & {
      payments: Array<{
        id: string;
        status: PaymentStatus;
        sessionId: string | null;
        packId: string | null;
        contract: { id: string } | null;
        reservation: { id: string } | null;
      }>;
    },
  ): Promise<MpWebhookProcessResult> {
    const actor = {
      profileType: 'MEMBER' as const,
      userId: cart.memberId,
    };
    let contractId: string | null = null;
    let reservationId: string | null = null;

    for (const payment of cart.payments) {
      if (payment.sessionId) {
        if (payment.reservation) {
          reservationId = payment.reservation.id;
          continue;
        }
        const reservation =
          await this.reservations.confirmDropInFromApprovedPayment(
            tenantId,
            payment.id,
            actor,
          );
        reservationId = reservation.id;
        continue;
      }
      if (payment.contract) {
        contractId = payment.contract.id;
        continue;
      }
      const contract = await this.contracts.confirmFromApprovedPayment(
        tenantId,
        payment.id,
        actor,
      );
      contractId = contract.id;
    }

    return {
      handled: true,
      paymentId: cart.id,
      cartId: cart.id,
      status: cart.status,
      contractId,
      reservationId,
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
          cartId: null,
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
        cartId: null,
        status: payment.status,
        contractId: null,
        reservationId: reservation.id,
      };
    }

    if (payment.contract) {
      return {
        handled: true,
        paymentId: payment.id,
        cartId: null,
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
      cartId: null,
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
}
