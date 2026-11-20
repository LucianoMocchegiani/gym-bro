import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MemberStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { PacksService } from '../packs/packs.service';
import { SessionValidationService } from '../sessions/session-validation.service';
import { CreateMpCartCheckoutDto } from './dto/create-mp-cart-checkout.dto';
import { HttpMpQrAdapter, MpQrOrder } from './http-mp-qr.adapter';
import { MercadoPagoAccountService } from './mercadopago-account.service';
import { WebhookPaymentService } from './webhook-payment.service';

export type MpPointQrCheckoutResult = {
  transactionId: string;
  memberId: string;
  status: PaymentStatus;
  amount: number;
  idempotencyKey: string;
  mpOrderId: string | null;
  qrData: string | null;
};

export type MpPointQrOrderStatus = {
  orderId: string;
  status: string;
  approved: boolean;
};

@Injectable()
export class MpPointQrService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accounts: MercadoPagoAccountService,
    private readonly mpQr: HttpMpQrAdapter,
    private readonly packs: PacksService,
    private readonly sessionValidation: SessionValidationService,
    private readonly webhookPayment: WebhookPaymentService,
  ) {}

  async startStaffCart(
    tenantId: string,
    memberId: string,
    dto: CreateMpCartCheckoutDto,
    recordedByStaffId: string,
  ): Promise<MpPointQrCheckoutResult> {
    if (dto.applyTrial) {
      throw new BadRequestException('QR checkout does not support trials');
    }
    const member = await this.prisma.member.findFirst({
      where: { id: memberId, tenantId },
      select: { id: true, status: true },
    });
    if (!member) {
      throw new NotFoundException(`Member ${memberId} not found`);
    }
    if (member.status !== MemberStatus.ACTIVE) {
      throw new BadRequestException('Member is not active');
    }

    const lines = await this.resolveCartLines(tenantId, dto.items, memberId);
    const amount = lines.reduce(
      (sum, line) => sum + line.amount * line.quantity,
      0,
    );
    const idempotencyKey =
      dto.idempotencyKey?.trim() ||
      `mp-point-qr-${randomBytes(16).toString('hex')}`;
    let transaction = await this.prisma.transaction.findUnique({
      where: { tenantId_idempotencyKey: { tenantId, idempotencyKey } },
      include: { transactionItems: { orderBy: { createdAt: 'asc' } } },
    });

    if (transaction && transaction.memberId !== memberId) {
      throw new BadRequestException(
        'Idempotency key already used for a different checkout',
      );
    }
    if (transaction && transaction.mpPreferenceId) {
      throw new BadRequestException(
        'Idempotency key already used for a Mercado Pago link checkout',
      );
    }
    const storedOrder = transaction
      ? await this.prisma.mercadoPagoQrOrder.findUnique({
          where: { transactionId: transaction.id },
        })
      : null;
    if (storedOrder) {
      return this.toResult(transaction!, storedOrder);
    }
    if (transaction && transaction.status !== PaymentStatus.PENDING) {
      return this.toResult(transaction, null);
    }

    const expectedItems = lines
      .flatMap((line) =>
        Array.from(
          { length: line.quantity },
          () => `${line.sessionId ?? line.packId}:${line.amount}`,
        ),
      )
      .sort();
    if (transaction) {
      const savedItems = transaction.transactionItems
        .map((item) => `${item.sessionId ?? item.packId}:${item.amount}`)
        .sort();
      if (
        transaction.amount !== amount ||
        JSON.stringify(savedItems) !== JSON.stringify(expectedItems)
      ) {
        throw new BadRequestException(
          'Idempotency key already used for a different checkout',
        );
      }
    } else {
      let itemIndex = 0;
      try {
        transaction = await this.prisma.$transaction((tx) =>
          tx.transaction.create({
            data: {
              tenantId,
              memberId,
              amount,
              status: PaymentStatus.PENDING,
              idempotencyKey,
              recordedByStaffId,
              transactionItems: {
                create: lines.flatMap((line) =>
                  Array.from({ length: line.quantity }, () => ({
                    tenantId,
                    memberId,
                    packId: line.packId,
                    sessionId: line.sessionId,
                    amount: line.amount,
                    status: PaymentStatus.PENDING,
                    method: PaymentMethod.MP,
                    idempotencyKey: `${idempotencyKey}:${itemIndex++}`,
                  })),
                ),
              },
            },
            include: { transactionItems: { orderBy: { createdAt: 'asc' } } },
          }),
        );
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          transaction = await this.prisma.transaction.findUnique({
            where: { tenantId_idempotencyKey: { tenantId, idempotencyKey } },
            include: { transactionItems: { orderBy: { createdAt: 'asc' } } },
          });
          if (!transaction || transaction.memberId !== memberId) {
            throw new BadRequestException(
              'Could not safely reuse this QR checkout',
            );
          }
        } else {
          throw error;
        }
      }
    }

    const [account, setup] = await Promise.all([
      this.prisma.mercadoPagoAccount.findUnique({ where: { tenantId } }),
      this.prisma.mercadoPagoQrSetup.findUnique({ where: { tenantId } }),
    ]);
    if (
      !account?.mpUserId ||
      !setup?.posId ||
      setup.mpUserId !== account.mpUserId
    ) {
      throw new BadRequestException(
        'Configurá la caja QR de Mercado Pago en Config antes de cobrar.',
      );
    }

    try {
      const accessToken = await this.accounts.getDecryptedAccessToken(tenantId);
      const order = await this.mpQr.createOrder({
        accessToken,
        externalPosId: `gp${tenantId.replaceAll('-', '')}`,
        externalReference: transaction.id,
        amount: transaction.amount,
        idempotencyKey: transaction.id,
      });
      if (!order.qrData) {
        throw new Error('Mercado Pago QR order response missing QR data');
      }
      const savedOrder = await this.prisma.mercadoPagoQrOrder.create({
        data: {
          tenantId,
          transactionId: transaction.id,
          mpOrderId: order.id,
          qrData: order.qrData,
        },
      });
      return this.toResult(transaction, savedOrder);
    } catch {
      throw new BadGatewayException(
        'No se pudo crear el QR en Mercado Pago. Podés reintentar este cobro desde Caja.',
      );
    }
  }

  async getOrderStatus(
    tenantId: string,
    transactionId: string,
  ): Promise<MpPointQrOrderStatus> {
    const [transaction, qrOrder] = await Promise.all([
      this.prisma.transaction.findFirst({
        where: { id: transactionId, tenantId },
        include: { transactionItems: true },
      }),
      this.prisma.mercadoPagoQrOrder.findFirst({
        where: { transactionId, tenantId },
      }),
    ]);
    if (!transaction || !qrOrder || transaction.transactionItems.length === 0) {
      throw new NotFoundException('Mercado Pago QR order not found');
    }

    let order: MpQrOrder;
    try {
      const accessToken = await this.accounts.getDecryptedAccessToken(tenantId);
      order = await this.mpQr.getOrder(accessToken, qrOrder.mpOrderId);
    } catch {
      throw new BadGatewayException(
        'No se pudo consultar el estado del QR en Mercado Pago.',
      );
    }
    if (
      order.id !== qrOrder.mpOrderId ||
      order.type !== 'qr' ||
      order.externalReference !== transaction.id
    ) {
      throw new BadGatewayException(
        'La orden QR de Mercado Pago no coincide con este cobro.',
      );
    }

    const approved = order.status === 'processed';
    if (approved) {
      if (
        Number(order.totalPaidAmount) !== transaction.amount ||
        Number(order.totalAmount) !== transaction.amount
      ) {
        throw new BadGatewayException(
          'El monto acreditado por Mercado Pago no coincide con el cobro.',
        );
      }
      const payment = order.payments.find(
        (entry) =>
          entry.id &&
          (entry.status === 'approved' || entry.status === 'processed') &&
          (entry.amount === null || Number(entry.amount) === transaction.amount),
      );
      if (!payment?.id) {
        throw new BadGatewayException(
          'Mercado Pago no informó un pago acreditado para esta orden.',
        );
      }
      await this.webhookPayment.applyMpPaymentToCart(
        tenantId,
        transaction.id,
        payment.id,
        'approved',
      );
    }

    return { orderId: order.id, status: order.status, approved };
  }

  private async resolveCartLines(
    tenantId: string,
    items: CreateMpCartCheckoutDto['items'],
    memberId: string,
  ): Promise<
    Array<{
      packId: string | null;
      sessionId: string | null;
      amount: number;
      quantity: number;
    }>
  > {
    if (items.length === 0) {
      throw new BadRequestException('Cart must have at least one item');
    }
    const lines: Array<{
      packId: string | null;
      sessionId: string | null;
      amount: number;
      quantity: number;
    }> = [];
    for (const item of items) {
      const quantity = item.quantity ?? 1;
      if (item.kind === 'PACK') {
        const pack = await this.prisma.pack.findFirst({
          where: { id: item.id, tenantId, originServiceId: null },
          include: {
            components: {
              include: { service: { select: { name: true } } },
            },
          },
        });
        if (!pack) {
          throw new NotFoundException(`Pack ${item.id} not found in tenant`);
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
        lines.push({
          packId: pack.id,
          sessionId: null,
          amount: pack.price,
          quantity,
        });
        continue;
      }
      const session = await this.sessionValidation.validateSessionForDropIn(
        tenantId,
        memberId,
        item.id,
      );
      const dropInPack = await this.packs.ensureDropInPack(
        tenantId,
        session.serviceId,
        { requireEnabled: true },
      );
      if (!dropInPack) {
        throw new BadRequestException(
          'Drop-in is not enabled for this service (set dropInPrice)',
        );
      }
      lines.push({
        packId: dropInPack.id,
        sessionId: session.id,
        amount: dropInPack.price,
        quantity,
      });
    }
    return lines;
  }

  private toResult(
    transaction: {
      id: string;
      memberId: string | null;
      status: PaymentStatus;
      amount: number;
      idempotencyKey: string;
    },
    qrOrder: { mpOrderId: string; qrData: string } | null,
  ): MpPointQrCheckoutResult {
    return {
      transactionId: transaction.id,
      memberId: transaction.memberId ?? '',
      status: transaction.status,
      amount: transaction.amount,
      idempotencyKey: transaction.idempotencyKey,
      mpOrderId: qrOrder?.mpOrderId ?? null,
      qrData: qrOrder?.qrData ?? null,
    };
  }
}
