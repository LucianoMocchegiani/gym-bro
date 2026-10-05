import {
  BadGatewayException,
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaymentMethod } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MercadoPagoAccountService } from './mercadopago-account.service';
import { MP_ACCOUNT_PORT, MpAccountPort } from './mp-account.port';
import { MpPaymentStatusView } from './payment.types';

/**
 * Consulta en Mercado Pago el estado real de un cobro MP: neto, comisiones,
 * liberación de la plata y cuenta que cobró.
 *
 * @remarks Sin persistencia: cada consulta va a `GET /v1/payments/{id}` con el
 * token del tenant. Sirve para que el gym verifique la venta sin depender de la
 * app de MP. Los planes de Faciliter viejos cobrados en el gym se cobraron en
 * la cuenta de `admin` y no se consultan desde el gym.
 */
@Injectable()
export class MpPaymentStatusService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accounts: MercadoPagoAccountService,
    @Inject(MP_ACCOUNT_PORT) private readonly mp: MpAccountPort,
  ) {}

  async getForTransaction(
    tenantId: string,
    transactionId: string,
  ): Promise<MpPaymentStatusView> {
    const transaction = await this.prisma.transaction.findFirst({
      where: { id: transactionId, tenantId },
      select: {
        mpPaymentId: true,
        transactionItems: {
          select: {
            method: true,
            mpPaymentId: true,
            pack: { select: { tenantId: true } },
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
      !transaction.transactionItems.some((i) => i.method === PaymentMethod.MP)
    ) {
      throw new BadRequestException(
        'Transaction is not a Mercado Pago payment',
      );
    }
    if (
      transaction.transactionItems.some(
        (i) => i.pack && i.pack.tenantId !== tenantId,
      )
    ) {
      throw new BadRequestException(
        'Faciliter plan payments are checked by the platform',
      );
    }
    const mpPaymentId =
      transaction.mpPaymentId ??
      transaction.transactionItems.find((i) => i.mpPaymentId)?.mpPaymentId ??
      null;
    if (!mpPaymentId) {
      throw new BadRequestException('Mercado Pago has not reported a payment');
    }

    const accessToken = await this.accounts.getDecryptedAccessToken(tenantId);
    const account = await this.prisma.mercadoPagoAccount.findUnique({
      where: { tenantId },
      select: { mpUserId: true },
    });

    let remote;
    try {
      remote = await this.mp.getPayment(accessToken, mpPaymentId);
    } catch {
      throw new BadGatewayException(
        'Could not read the payment from Mercado Pago',
      );
    }

    const releaseAt = remote.moneyReleaseDate
      ? new Date(remote.moneyReleaseDate)
      : null;
    const released =
      remote.moneyReleaseStatus === 'released' ||
      (remote.moneyReleaseStatus === null &&
        remote.status === 'approved' &&
        releaseAt !== null &&
        releaseAt.getTime() <= Date.now());
    const collectorMatches =
      remote.collectorId && account?.mpUserId
        ? remote.collectorId === account.mpUserId
        : null;

    return {
      mpPaymentId: remote.id,
      status: remote.status,
      statusDetail: remote.statusDetail,
      dateApproved: remote.dateApproved,
      amount: remote.transactionAmount,
      netReceivedAmount: remote.netReceivedAmount,
      fees: remote.fees,
      feesTotal: remote.fees.reduce((sum, f) => sum + f.amount, 0),
      moneyReleaseDate: remote.moneyReleaseDate,
      moneyReleaseStatus: remote.moneyReleaseStatus,
      released,
      collectorId: remote.collectorId,
      collectorMatches,
    };
  }
}
