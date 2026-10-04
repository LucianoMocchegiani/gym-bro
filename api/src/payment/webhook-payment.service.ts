import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  forwardRef,
} from '@nestjs/common';
import {
  CashMovementConcept,
  NotificationEventCode,
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
import { PlatformSignupService } from '../tenants/platform-signup.service';
import { DebitService } from '../debit/debit.service';
import { NotificationDispatcher } from '../notifications/notifications.service';
import { MemberSignupService } from '../members/member-signup.service';

/**
 * Formato IPN viejo (`?topic=preapproval&id=`) → nombre del webhook nuevo.
 */
const LEGACY_TOPICS: Record<string, string> = {
  preapproval: 'subscription_preapproval',
  authorized_payment: 'subscription_authorized_payment',
};

function normalizeTopic(topic: string | undefined): string | undefined {
  return topic ? (LEGACY_TOPICS[topic] ?? topic) : topic;
}

type CartWithItems = Transaction & {
  transactionItems: Array<{
    id: string;
    memberId: string | null;
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
    @Inject(forwardRef(() => PlatformSignupService))
    private readonly platformSignups: PlatformSignupService,
    @Inject(forwardRef(() => DebitService))
    private readonly debit: DebitService,
    private readonly notifications: NotificationDispatcher,
    @Inject(forwardRef(() => MemberSignupService))
    private readonly memberSignups: MemberSignupService,
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
    const type = normalizeTopic(payload.type ?? query.topic ?? payload.topic);
    const dataId = payload.data?.id ?? query.id ?? payload.id;

    this.logger.log(
      `Webhook tenant=${tenantId} type=${type} action=${payload.action} dataId=${dataId}`,
    );

    if (type === 'subscription_preapproval' && dataId) {
      const platform = await this.platformSignups.handlePreapproval(
        tenantId,
        String(dataId),
      );
      if (platform.handled) {
        return platform;
      }
      return this.debit.handlePreapproval(tenantId, String(dataId));
    }
    if (type === 'subscription_authorized_payment' && dataId) {
      return this.handleAuthorizedPayment(tenantId, String(dataId));
    }

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

    const signup = await this.prisma.platformSignup.findUnique({
      where: { id: refId },
      select: {
        id: true,
        status: true,
        identityId: true,
        tenantId: true,
        gymName: true,
        pack: { select: { name: true } },
      },
    });
    if (signup && remote.status === 'approved') {
      return this.platformSignups.handlePaidSignup(tenantId, signup.id, {
        paymentId: mpPaymentId,
        amount: remote.transactionAmount,
      });
    }
    if (
      signup &&
      (remote.status === 'rejected' || remote.status === 'cancelled')
    ) {
      await this.notifications.notifyPlatformOwner({
        tenantId: signup.tenantId ?? tenantId,
        identityId: signup.identityId,
        event: NotificationEventCode.PLATFORM_DEBIT_CHARGE_FAILED,
        idempotencyKey: `PLATFORM_DEBIT_CHARGE_FAILED:${signup.id}:${mpPaymentId}`,
        extraVars: {
          pack: signup.pack.name,
          motivo: remote.status,
          gym: signup.gymName,
        },
        payload: { signupId: signup.id, mpPaymentId },
      });
      return {
        handled: true,
        transactionItemId: null,
        transactionId: null,
        status: remote.status,
        contractId: null,
        reservationId: null,
      };
    }

    const memberSignup = await this.applyMemberSignup(
      tenantId,
      refId,
      mpPaymentId,
      remote.status,
    );
    if (memberSignup) {
      return memberSignup;
    }

    const mandate = await this.prisma.debitMandate.findFirst({
      where: { id: refId, tenantId },
      select: { id: true },
    });
    if (mandate) {
      return this.debit.applyMpPayment(
        tenantId,
        mandate.id,
        mpPaymentId,
        remote.status,
      );
    }

    return this.applyRemoteStatus(tenantId, refId, mpPaymentId, remote.status);
  }

  /**
   * Ciclo de suscripción MP → nace el gym si el alta no era de prueba.
   */
  private async handleAuthorizedPayment(
    tenantId: string,
    authorizedPaymentId: string,
  ): Promise<MpWebhookProcessResult> {
    const accessToken = await this.accounts.getDecryptedAccessToken(tenantId);
    let remote;
    try {
      remote = await this.mp.getAuthorizedPayment(
        accessToken,
        authorizedPaymentId,
      );
    } catch (err) {
      this.logger.warn(
        `authorized_payment fetch failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new ServiceUnavailableException(
        'Could not fetch Mercado Pago authorized_payment',
      );
    }
    const paid = remote.status === 'approved' || remote.status === 'processed';
    const signupRow = remote.externalReference
      ? await this.prisma.platformSignup.findUnique({
          where: { id: remote.externalReference },
          select: {
            id: true,
            status: true,
            identityId: true,
            tenantId: true,
            gymName: true,
            pack: { select: { name: true } },
          },
        })
      : null;
    const signupByPre =
      !signupRow && remote.preapprovalId
        ? await this.prisma.platformSignup.findUnique({
            where: { mpPreapprovalId: remote.preapprovalId },
            select: {
              id: true,
              status: true,
              identityId: true,
              tenantId: true,
              gymName: true,
              pack: { select: { name: true } },
            },
          })
        : null;
    const signup = signupRow ?? signupByPre;
    if (signup) {
      if (paid) {
        if (!remote.paymentId) {
          // Sin pago asociado todavía: lo aplica el webhook `payment` o el chequeo horario.
          return {
            handled: true,
            transactionItemId: null,
            transactionId: null,
            status: remote.status,
            contractId: null,
            reservationId: null,
          };
        }
        return this.platformSignups.handlePaidSignup(tenantId, signup.id, {
          paymentId: remote.paymentId,
          amount: remote.transactionAmount,
        });
      }
      await this.notifications.notifyPlatformOwner({
        tenantId: signup.tenantId ?? tenantId,
        identityId: signup.identityId,
        event: NotificationEventCode.PLATFORM_DEBIT_CHARGE_FAILED,
        idempotencyKey: `PLATFORM_DEBIT_CHARGE_FAILED:${signup.id}:${remote.paymentId ?? remote.status}`,
        extraVars: {
          pack: signup.pack.name,
          motivo: remote.status,
          gym: signup.gymName,
        },
        payload: { signupId: signup.id, status: remote.status },
      });
      return {
        handled: true,
        transactionItemId: null,
        transactionId: null,
        status: remote.status,
        contractId: null,
        reservationId: null,
      };
    }

    if (!paid) {
      return {
        handled: false,
        transactionItemId: null,
        transactionId: null,
        status: remote.status,
        contractId: null,
        reservationId: null,
      };
    }

    return this.debit.applyAuthorizedPayment(tenantId, {
      preapprovalId: remote.preapprovalId,
      externalReference: remote.externalReference,
      paymentId: remote.paymentId,
      status: remote.status,
    });
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

    const memberSignup = await this.applyMemberSignup(
      tenantId,
      refId,
      approved.id,
      approved.status,
    );
    if (memberSignup) {
      return memberSignup;
    }

    return this.applyRemoteStatus(
      tenantId,
      refId,
      approved.id,
      approved.status,
    );
  }

  /**
   * `externalReference` de un alta web de socio (RN-CTA-007): con el pago
   * aprobado nacen el socio y su cart, que se confirma como cualquier cart MP.
   *
   * @returns null si la referencia no es un alta.
   */
  private async applyMemberSignup(
    tenantId: string,
    refId: string,
    mpPaymentId: string,
    remoteStatus: string,
  ): Promise<MpWebhookProcessResult | null> {
    const signup = await this.prisma.memberSignup.findFirst({
      where: { id: refId, tenantId },
      select: { id: true },
    });
    if (!signup) {
      return null;
    }
    const transactionId =
      remoteStatus === 'approved'
        ? await this.memberSignups.fulfillPaid(tenantId, signup.id)
        : null;
    if (!transactionId) {
      return {
        handled: true,
        transactionItemId: null,
        transactionId: null,
        status: remoteStatus,
        contractId: null,
        reservationId: null,
      };
    }
    return this.applyRemoteStatusCart(
      tenantId,
      transactionId,
      mpPaymentId,
      remoteStatus,
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
        transaction: { select: { recordedByStaffId: true } },
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
      throw new NotFoundException(
        `TransactionItem ${transactionItemId} not found in tenant`,
      );
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
        const result = await this.ensureRights(tenantId, transactionItem);
        if (transactionItem.transactionId) {
          await this.notifications.notifyPaymentApproved(
            tenantId,
            transactionItem.transactionId,
          );
        }
        return result;
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

    await this.prisma.$transaction(
      async (tx) => {
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
            recordedByStaffId:
              transactionItem.transaction?.recordedByStaffId ?? null,
          });
          if (transactionItem.transactionId) {
            const confirmed = await tx.transaction.findFirstOrThrow({
              where: { id: transactionItem.transactionId },
              include: { transactionItems: true },
            });
            await this.issueMpTransactionReceipt(tx, tenantId, confirmed);
          }
        }
      },
      { timeout: 15000 },
    );

    const refreshed = await this.prisma.transactionItem.findFirstOrThrow({
      where: { id: transactionItem.id, tenantId },
      include: {
        contract: { select: { id: true } },
        reservation: { select: { id: true } },
      },
    });

    const result = await this.ensureRights(tenantId, refreshed);
    if (transactionItem.transactionId) {
      await this.notifications.notifyPaymentApproved(
        tenantId,
        transactionItem.transactionId,
      );
    }
    return result;
  }

  /**
   * Confirma un cart MP a partir de un pago (débito / Checkout API).
   *
   * @remarks Misma ruta que el webhook cuando `externalReference` es el cart.
   */
  async applyMpPaymentToCart(
    tenantId: string,
    transactionId: string,
    mpPaymentId: string,
    remoteStatus: string,
  ): Promise<MpWebhookProcessResult> {
    return this.applyRemoteStatusCart(
      tenantId,
      transactionId,
      mpPaymentId,
      remoteStatus,
    );
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
      throw new NotFoundException(
        `Transaction ${transactionId} not found in tenant`,
      );
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
        await this.persistApprovedCartEffects(
          tenantId,
          transaction,
          mpPaymentId,
        );
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

  private async loadCart(
    tenantId: string,
    transactionId: string,
  ): Promise<CartWithItems> {
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
      memberId: string | null;
      recordedByStaffId: string | null;
      billedTenantId: string | null;
      transactionItems: Array<{
        id: string;
        memberId: string | null;
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
        recordedByStaffId: transaction.recordedByStaffId,
      });
    }
    await this.issueMpTransactionReceipt(tx, tenantId, transaction);
  }

  private async ensureCartRights(
    tenantId: string,
    transaction: Transaction & {
      transactionItems: Array<{
        id: string;
        memberId: string | null;
        status: PaymentStatus;
        sessionId: string | null;
        packId: string | null;
        contract: { id: string } | null;
        reservation: { id: string } | null;
      }>;
    },
  ): Promise<MpWebhookProcessResult> {
    let contractId: string | null = null;
    let reservationId: string | null = null;

    for (const transactionItem of transaction.transactionItems) {
      const fulfilled = await this.fulfillApprovedItem(
        tenantId,
        transactionItem,
      );
      if (fulfilled.contractId) {
        contractId = fulfilled.contractId;
      }
      if (fulfilled.reservationId) {
        reservationId = fulfilled.reservationId;
      }
    }

    await this.notifications.notifyPaymentApproved(tenantId, transaction.id);

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
      memberId: string | null;
      status: PaymentStatus;
      sessionId: string | null;
      packId: string | null;
      contract: { id: string } | null;
      reservation: { id: string } | null;
    },
  ): Promise<MpWebhookProcessResult> {
    return this.fulfillApprovedItem(tenantId, transactionItem);
  }

  /**
   * Contrato (si hay pack) y reserva CREDIT (si hay sesión) para un ítem APPROVED.
   */
  private async fulfillApprovedItem(
    tenantId: string,
    transactionItem: {
      id: string;
      memberId: string | null;
      status: PaymentStatus;
      sessionId: string | null;
      packId: string | null;
      contract: { id: string } | null;
      reservation: { id: string } | null;
    },
  ): Promise<MpWebhookProcessResult> {
    const actor = {
      profileType: 'MEMBER' as const,
      userId: transactionItem.memberId ?? '',
    };

    let contractId = transactionItem.contract?.id ?? null;
    let reservationId = transactionItem.reservation?.id ?? null;

    if (transactionItem.packId && !contractId) {
      const contract = await this.contractsService.confirmFromApprovedPayment(
        tenantId,
        transactionItem.id,
        actor,
      );
      contractId = contract.id;
    }

    if (transactionItem.sessionId && !reservationId) {
      if (!contractId) {
        throw new BadRequestException(
          'Drop-in payment is missing pack contract',
        );
      }
      if (!transactionItem.memberId) {
        return {
          handled: true,
          transactionItemId: transactionItem.id,
          transactionId: null,
          status: null,
          contractId,
          reservationId: null,
        };
      }
      const reservation = await this.reservationsService.createForMember(
        tenantId,
        transactionItem.memberId,
        {
          sessionId: transactionItem.sessionId,
          contractId,
        },
        actor,
      );
      reservationId = reservation.id;
    }

    return {
      handled: true,
      transactionItemId: transactionItem.id,
      transactionId: null,
      status: transactionItem.status,
      contractId,
      reservationId,
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
      memberId: string | null;
      billedTenantId?: string | null;
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
    const label =
      confirmed.transactionItems.length <= 1
        ? firstItem?.packId
          ? 'Pack'
          : 'Drop-in'
        : `${confirmed.transactionItems.length} items`;
    const billed = confirmed.billedTenantId
      ? await tx.tenant.findUnique({
          where: { id: confirmed.billedTenantId },
          select: { name: true },
        })
      : null;
    await this.receiptsService.issueForApprovedPayment(tx, {
      tenantId,
      transactionId: confirmed.id,
      memberId: confirmed.memberId,
      amount: total,
      method: PaymentMethod.MP,
      concept: packOnly ? ReceiptConcept.PACK_CONTRACT : ReceiptConcept.DROP_IN,
      description: billed ? `${label} — ${billed.name}` : label,
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
