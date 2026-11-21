import { BadGatewayException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MercadoPagoAccountService } from './mercadopago-account.service';
import { HttpMpQrAdapter } from './http-mp-qr.adapter';

export type MpPointQrOrderDiagnostic = {
  orderId: string;
  status: string;
  mode: string | null;
  totalAmount: string | null;
  totalPaidAmount: string | null;
  payments: Array<{ status: string; amount: string | null }>;
};

@Injectable()
export class MpPointQrOrderDiagnosticService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accounts: MercadoPagoAccountService,
    private readonly mpQr: HttpMpQrAdapter,
  ) {}

  async getOrderDiagnostic(
    tenantId: string,
    transactionId: string,
    orderId: string,
  ): Promise<MpPointQrOrderDiagnostic> {
    const transaction = await this.prisma.transaction.findFirst({
      where: { id: transactionId, tenantId },
      select: { id: true },
    });
    if (!transaction) throw new NotFoundException('Transaction not found');

    let order;
    try {
      const accessToken = await this.accounts.getDecryptedAccessToken(tenantId);
      order = await this.mpQr.getOrderDiagnostic(accessToken, orderId);
    } catch {
      throw new BadGatewayException(
        'No se pudo consultar la orden en Mercado Pago.',
      );
    }
    if (
      order.id !== orderId ||
      order.type !== 'qr' ||
      order.externalReference !== transaction.id
    ) {
      throw new BadGatewayException(
        'La orden QR de Mercado Pago no coincide con esta transacción.',
      );
    }

    return {
      orderId: order.id,
      status: order.status,
      mode: order.mode,
      totalAmount: order.totalAmount,
      totalPaidAmount: order.totalPaidAmount,
      payments: order.payments,
    };
  }
}
