import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  CashMovementConcept,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  ReceiptConcept,
  Transaction,
} from '@prisma/client';
import { MercadoPagoAccountService } from './mercadopago-account.service';
import { MP_ACCOUNT_PORT, MpAccountPort } from './mp-account.port';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentRegisterService } from '../payment-register/register.service';
import { ReceiptsService } from '../receipts/receipts.service';
import { ContractsService } from '../contracts/contracts.service';
import { ReservationsService } from '../reservations/reservations.service';
import { MpWebhookProcessResult } from './payment.types';

type CartWithItems = Transaction & {
  transactionItems: Array<{
    id: string;
    memberId: string;
    status: PaymentStatus;
    sessionId: string | null;
    packId: string | null;
    amount: number;
    contract: { id: string } | null;
    reservation: { id: string } | null;
  }>;
};

/**
 * Procesa webhooks de pago (Mercado Pago).
 *
 * @description
 * - Valida la notificación de MP
 * - Confirma la Transaction
 * - Registra el movimiento en caja
 * - Emite el comprobante
 * - Activa los derechos (contrato/reserva)
 */
@Injectable()
export class WebhookPaymentService {
  private readonly logger = new Logger(WebhookPaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly accounts: MercadoPagoAccountService,
    private readonly registerService: PaymentRegisterService,
    private readonly receiptsService: ReceiptsService,
    private readonly contractsService: ContractsService,
    private readonly reservationsService: ReservationsService,
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
      `Webhook tenant=${tenantId} type=${type} action=${payload.action} dataId=${dataId}`,
    );

    if (type === 'merchant_order' && dataId) {
      return this.handleMerchantOrder(tenantId, String(dataId));
    }

    const mpPaymentId = this.extractMpPaymentId(payload, query);
    if (!mpPaymentId) {
      return {
        handled: false,
        transactionItemId: null,
        transactionId: null,
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
        `Webhook fetch failed tenant=${tenantId} mpPaymentId=${mpPaymentId}: ${
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
        transactionItemId: null,
        transactionId: null,
        status: remote.status,
        contractId: null,
        reservationId: null,
      };
    }

    return this.applyRemoteStatus(tenantId, refId, mpPaymentId, remote.status);
  }

  /**
   * Procesa notificación de tipo merchant_order.
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
        `Merchant_order fetch failed tenant=${tenantId} moId=${merchantOrderId}: ${
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
        transactionItemId: null,
        transactionId: null,
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
        transactionItemId: null,
        transactionId: null,
        status: first?.status ?? mo.status,
        contractId: null,
        reservationId: null,
      };
    }

    const refId = mo.externalReference;
    if (!refId) {
      return {
        handled: false,
        transactionItemId: null,
        transactionId: null,
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
    transactionItemId: string,
    mpPaymentId: string,
    remoteStatus: string,
  ): Promise<MpWebhookProcessResult> {
    const transactionItem = await this.prisma.transactionItem.findFirst({
      where: { id: transactionItemId, tenantId },
      include: {
        contract: { select: { id: true } },
        reservation: { select: { id: true } },
      },
    });

    if (!transactionItem) {
      const transaction = await this.prisma.transaction.findFirst({
        where: { id: transactionItemId, tenantId },
      });
      if (transaction) {
        return this.applyRemoteStatusCart(
          tenantId,
          transaction.id,
          mpPaymentId,
          remoteStatus,
        );
      }
      throw new NotFoundException(`TransactionItem ${transactionItemId} not found in tenant`);
    }
    if (transactionItem.method !== PaymentMethod.MP) {
      throw new BadRequestException('TransactionItem is not an MP checkout');
    }

    if (
      transactionItem.mpPaymentId &&
      transactionItem.mpPaymentId !== mpPaymentId &&
      transactionItem.status !== PaymentStatus.PENDING
    ) {
      this.logger.warn(
        `Ignoring webhook with different mpPaymentId for transactionItem ${transactionItemId}`,
      );
      return {
        handled: true,
        transactionItemId: transactionItem.id,
        transactionId: null,
        status: transactionItem.status,
        contractId: transactionItem.contract?.id ?? null,
        reservationId: transactionItem.reservation?.id ?? null,
      };
    }

    const mapped = this.mapMpStatus(remoteStatus);
    if (!mapped) {
      return {
        handled: false,
        transactionItemId: transactionItem.id,
        transactionId: null,
        status: remoteStatus,
        contractId: transactionItem.contract?.id ?? null,
        reservationId: transactionItem.reservation?.id ?? null,
      };
    }

    if (
      transactionItem.status === PaymentStatus.APPROVED ||
      transactionItem.status === PaymentStatus.REJECTED ||
      transactionItem.status === PaymentStatus.REFUNDED
    ) {
      if (transactionItem.status === PaymentStatus.APPROVED) {
        return this.ensureRights(tenantId, transactionItem);
      }
      return {
        handled: true,
        transactionItemId: transactionItem.id,
        transactionId: null,
        status: transactionItem.status,
        contractId: transactionItem.contract?.id ?? null,
        reservationId: transactionItem.reservation?.id ?? null,
      };
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.transactionItem.update({
        where: { id: transactionItem.id },
        data: {
          status: mapped,
          mpPaymentId,
        },
      });

      if (mapped === PaymentStatus.APPROVED) {
        if (transactionItem.transactionId) {
          await tx.transaction.update({
            where: { id: transactionItem.transactionId },
            data: { status: PaymentStatus.APPROVED, mpPaymentId },
          });
        }
        await this.registerService.recordIncome(tx, {
          tenantId,
          transactionItemId: transactionItem.id,
          memberId: transactionItem.memberId,
          amount: transactionItem.amount,
          method: PaymentMethod.MP,
          concept: transactionItem.packId
            ? CashMovementConcept.PACK_CONTRACT
            : CashMovementConcept.DROP_IN,
          recordedByStaffId: null,
        });
        if (transactionItem.transactionId) {
          const confirmed = await tx.transaction.findFirstOrThrow({
            where: { id: transactionItem.transactionId },
            include: { transactionItems: true },
          });
          await this.issueMpTransactionReceipt(tx, tenantId, confirmed);
        }
      }
    }, { timeout: 15000 });

    const refreshed = await this.prisma.transactionItem.findFirstOrThrow({
      where: { id: transactionItem.id, tenantId },
      include: {
        contract: { select: { id: true } },
        reservation: { select: { id: true } },
      },
    });

    return this.ensureRights(tenantId, refreshed);
  }

  /**
   * Aplica el status remoto de MP a un cart (`externalReference` = transaction.id).
   *
   * @remarks El primer APPROVED persiste status + `mpPaymentId`, caja y
   * comprobante en una `$transaction` (sin `confirmTransaction` anidado).
   * Un webhook posterior sobre un cart ya APPROVED completa efectos faltantes
   * (receipt/caja/`mpPaymentId`) de forma idempotente.
   */
  private async applyRemoteStatusCart(
    tenantId: string,
    transactionId: string,
    mpPaymentId: string,
    remoteStatus: string,
  ): Promise<MpWebhookProcessResult> {
    const transaction = await this.prisma.transaction.findFirst({
      where: { id: transactionId, tenantId },
      include: {
        transactionItems: {
          include: {
            contract: { select: { id: true } },
            reservation: { select: { id: true } },
          },
        },
      },
    });
    if (!transaction) {
      throw new NotFoundException(`Transaction ${transactionId} not found in tenant`);
    }

    if (
      transaction.mpPaymentId &&
      transaction.mpPaymentId !== mpPaymentId &&
      transaction.status !== PaymentStatus.PENDING
    ) {
      this.logger.warn(
        `Ignoring webhook with different mpPaymentId for transaction ${transactionId}`,
      );
      return {
        handled: true,
        transactionItemId: transaction.id,
        transactionId: transaction.id,
        status: transaction.status,
        contractId: null,
        reservationId: null,
      };
    }

    const mapped = this.mapMpStatus(remoteStatus);
    if (!mapped) {
      return {
        handled: false,
        transactionItemId: transaction.id,
        transactionId: transaction.id,
        status: remoteStatus,
        contractId: null,
        reservationId: null,
      };
    }

    if (
      transaction.status === PaymentStatus.APPROVED ||
      transaction.status === PaymentStatus.REJECTED ||
      transaction.status === PaymentStatus.REFUNDED
    ) {
      if (transaction.status === PaymentStatus.APPROVED) {
        await this.persistApprovedCartEffects(tenantId, transaction, mpPaymentId);
        const refreshed = await this.loadCart(tenantId, transaction.id);
        return this.ensureCartRights(tenantId, refreshed);
      }
      return {
        handled: true,
        transactionItemId: transaction.id,
        transactionId: transaction.id,
        status: transaction.status,
        contractId: null,
        reservationId: null,
      };
    }

    await this.prisma.$transaction(
      async (tx) => {
        await tx.transaction.update({
          where: { id: transaction.id },
          data: { status: mapped, mpPaymentId },
        });

        if (mapped === PaymentStatus.APPROVED) {
          await tx.transactionItem.updateMany({
            where: { transactionId: transaction.id },
            data: { status: PaymentStatus.APPROVED },
          });
          await this.writeApprovedCartEffects(tx, tenantId, transaction);
        } else {
          await tx.transactionItem.updateMany({
            where: { transactionId: transaction.id },
            data: { status: PaymentStatus.REJECTED },
          });
        }
      },
      { timeout: 15000 },
    );

    const refreshed = await this.loadCart(tenantId, transaction.id);
    if (mapped === PaymentStatus.APPROVED) {
      return this.ensureCartRights(tenantId, refreshed);
    }
    return {
      handled: true,
      transactionItemId: transaction.id,
      transactionId: transaction.id,
      status: mapped,
      contractId: null,
      reservationId: null,
    };
  }

  private async loadCart(tenantId: string, transactionId: string): Promise<CartWithItems> {
    return this.prisma.transaction.findFirstOrThrow({
      where: { id: transactionId, tenantId },
      include: {
        transactionItems: {
          include: {
            contract: { select: { id: true } },
            reservation: { select: { id: true } },
          },
        },
      },
    });
  }

  /**
   * Completa caja + comprobante + mpPaymentId de un cart ya APPROVED (reintento de webhook).
   */
  private async persistApprovedCartEffects(
    tenantId: string,
    transaction: CartWithItems,
    mpPaymentId: string,
  ): Promise<void> {
    await this.prisma.$transaction(
      async (tx) => {
        if (!transaction.mpPaymentId) {
          await tx.transaction.update({
            where: { id: transaction.id },
            data: { mpPaymentId },
          });
        }
        await this.writeApprovedCartEffects(tx, tenantId, transaction);
      },
      { timeout: 15000 },
    );
  }

  private async writeApprovedCartEffects(
    tx: Prisma.TransactionClient,
    tenantId: string,
    transaction: {
      id: string;
      memberId: string;
      transactionItems: Array<{
        id: string;
        memberId: string;
        packId: string | null;
        amount: number;
      }>;
    },
  ): Promise<void> {
    for (const item of transaction.transactionItems) {
      await this.registerService.recordIncome(tx, {
        tenantId,
        transactionItemId: item.id,
        memberId: item.memberId,
        amount: item.amount,
        method: PaymentMethod.MP,
        concept: item.packId
          ? CashMovementConcept.PACK_CONTRACT
          : CashMovementConcept.DROP_IN,
        recordedByStaffId: null,
      });
    }
    await this.issueMpTransactionReceipt(tx, tenantId, transaction);
  }

  private async ensureCartRights(
    tenantId: string,
    transaction: Transaction & {
      transactionItems: Array<{
        id: string;
        memberId: string;
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
      userId: transaction.memberId,
    };
    let contractId: string | null = null;
    let reservationId: string | null = null;

    for (const transactionItem of transaction.transactionItems) {
      if (transactionItem.sessionId) {
        if (transactionItem.reservation) {
          reservationId = transactionItem.reservation.id;
          continue;
        }
        const reservation =
          await this.reservationsService.confirmDropInFromApprovedPayment(
            tenantId,
            transactionItem.id,
            actor,
          );
        reservationId = reservation.id;
        continue;
      }
      if (transactionItem.packId) {
        if (transactionItem.contract) {
          contractId = transactionItem.contract.id;
          continue;
        }
        const contract = await this.contractsService.confirmFromApprovedPayment(
          tenantId,
          transactionItem.id,
          actor,
        );
        contractId = contract.id;
      }
    }

    return {
      handled: true,
      transactionItemId: transaction.id,
      transactionId: transaction.id,
      status: transaction.status,
      contractId,
      reservationId,
    };
  }

  private async ensureRights(
    tenantId: string,
    transactionItem: {
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
      userId: transactionItem.memberId,
    };

    if (transactionItem.sessionId) {
      if (transactionItem.reservation) {
        return {
          handled: true,
          transactionItemId: transactionItem.id,
          transactionId: null,
          status: transactionItem.status,
          contractId: null,
          reservationId: transactionItem.reservation.id,
        };
      }
      const reservation =
        await this.reservationsService.confirmDropInFromApprovedPayment(
          tenantId,
          transactionItem.id,
          actor,
        );
      return {
        handled: true,
        transactionItemId: transactionItem.id,
        transactionId: null,
        status: transactionItem.status,
        contractId: null,
        reservationId: reservation.id,
      };
    }

    if (transactionItem.packId) {
      if (transactionItem.contract) {
        return {
          handled: true,
          transactionItemId: transactionItem.id,
          transactionId: null,
          status: transactionItem.status,
          contractId: transactionItem.contract.id,
          reservationId: null,
        };
      }
      const contract = await this.contractsService.confirmFromApprovedPayment(
        tenantId,
        transactionItem.id,
        actor,
      );
      return {
        handled: true,
        transactionItemId: transactionItem.id,
        transactionId: null,
        status: transactionItem.status,
        contractId: contract.id,
        reservationId: null,
      };
    }

    return {
      handled: true,
      transactionItemId: transactionItem.id,
      transactionId: null,
      status: transactionItem.status,
      contractId: null,
      reservationId: null,
    };
  }

  /**
   * Un comprobante por Transaction (total del cart), no por ítem.
   *
   * @remarks Idempotente vía `issueForApprovedPayment`. Pack-only → PACK_CONTRACT;
   * drop-in o mixto → DROP_IN (mismo criterio que el cart CASH).
   */
  private async issueMpTransactionReceipt(
    tx: Prisma.TransactionClient,
    tenantId: string,
    confirmed: {
      id: string;
      memberId: string;
      transactionItems: Array<{ packId: string | null; amount: number }>;
    },
  ): Promise<void> {
    const total = confirmed.transactionItems.reduce(
      (sum, item) => sum + item.amount,
      0,
    );
    const packOnly =
      confirmed.transactionItems.length > 0 &&
      confirmed.transactionItems.every((item) => item.packId);
    const firstItem = confirmed.transactionItems[0];
    await this.receiptsService.issueForApprovedPayment(tx, {
      tenantId,
      transactionId: confirmed.id,
      memberId: confirmed.memberId,
      amount: total,
      method: PaymentMethod.MP,
      concept: packOnly ? ReceiptConcept.PACK_CONTRACT : ReceiptConcept.DROP_IN,
      description:
        confirmed.transactionItems.length <= 1
          ? firstItem?.packId
            ? 'Pack'
            : 'Drop-in'
          : `${confirmed.transactionItems.length} items`,
    });
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
