import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import {
  PaymentMethod,
  PaymentStatus,
  Prisma,
  ReceiptConcept,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ReceiptDetail } from './receipts.types';

type Tx = Prisma.TransactionClient;

/**
 * Comprobantes internos de pagos aprobados (RN-PAG-009).
 *
 * @remarks Emisión en la misma transacción del pago. Email N1 diferido (E8).
 */
@Injectable()
export class ReceiptsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Emite comprobante para un pago APPROVED (idempotente por paymentId).
   */
  async issueForApprovedPayment(
    tx: Tx,
    input: {
      tenantId: string;
      paymentId: string;
      memberId: string;
      amount: number;
      method: PaymentMethod;
      concept: ReceiptConcept;
      description?: string | null;
    },
  ): Promise<void> {
    const existing = await tx.receipt.findUnique({
      where: { paymentId: input.paymentId },
      select: { id: true },
    });
    if (existing) {
      return;
    }

    const number = await this.nextNumber(tx, input.tenantId);
    await tx.receipt.create({
      data: {
        tenantId: input.tenantId,
        paymentId: input.paymentId,
        memberId: input.memberId,
        number,
        amount: input.amount,
        method: input.method,
        concept: input.concept,
        description: input.description?.trim() || null,
      },
    });
  }

  /**
   * Lista comprobantes de un afiliado (más recientes primero).
   */
  async listByMember(
    tenantId: string,
    memberId: string,
  ): Promise<ReceiptDetail[]> {
    await this.assertMemberInTenant(tenantId, memberId);
    const rows = await this.prisma.receipt.findMany({
      where: { tenantId, memberId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.toDetail(r));
  }

  /**
   * Detalle por id (staff o dueño member).
   */
  async findOne(
    tenantId: string,
    receiptId: string,
    options: { ownerMemberId?: string } = {},
  ): Promise<ReceiptDetail> {
    const receipt = await this.prisma.receipt.findFirst({
      where: { id: receiptId, tenantId },
    });
    if (!receipt) {
      throw new NotFoundException(`Receipt ${receiptId} not found in tenant`);
    }
    if (options.ownerMemberId && receipt.memberId !== options.ownerMemberId) {
      throw new NotFoundException(`Receipt ${receiptId} not found in tenant`);
    }
    return this.toDetail(receipt);
  }

  /**
   * Comprobante asociado a un pago del tenant.
   */
  async findByPayment(
    tenantId: string,
    paymentId: string,
  ): Promise<ReceiptDetail> {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, tenantId },
      select: { id: true, status: true },
    });
    if (!payment) {
      throw new NotFoundException(`Payment ${paymentId} not found in tenant`);
    }
    if (payment.status !== PaymentStatus.APPROVED) {
      throw new ForbiddenException(
        'Receipt is only available for APPROVED payments',
      );
    }
    const receipt = await this.prisma.receipt.findUnique({
      where: { paymentId },
    });
    if (!receipt) {
      throw new NotFoundException(
        `Receipt for payment ${paymentId} not found (legacy payment without receipt)`,
      );
    }
    return this.toDetail(receipt);
  }

  private async nextNumber(tx: Tx, tenantId: string): Promise<number> {
    const rows = await tx.$queryRaw<{ n: number }[]>`
      INSERT INTO receipt_sequences (tenant_id, next_number)
      VALUES (${tenantId}::uuid, 2)
      ON CONFLICT (tenant_id)
      DO UPDATE SET next_number = receipt_sequences.next_number + 1
      RETURNING (next_number - 1) AS n
    `;
    const n = rows[0]?.n;
    if (n === undefined || n < 1) {
      throw new Error('Failed to allocate receipt number');
    }
    return Number(n);
  }

  private async assertMemberInTenant(
    tenantId: string,
    memberId: string,
  ): Promise<void> {
    const member = await this.prisma.member.findFirst({
      where: { id: memberId, tenantId },
      select: { id: true },
    });
    if (!member) {
      throw new NotFoundException(`Member ${memberId} not found in tenant`);
    }
  }

  private toDetail(row: {
    id: string;
    tenantId: string;
    paymentId: string;
    memberId: string;
    number: number;
    amount: number;
    method: PaymentMethod;
    concept: ReceiptConcept;
    description: string | null;
    createdAt: Date;
  }): ReceiptDetail {
    return {
      id: row.id,
      tenantId: row.tenantId,
      paymentId: row.paymentId,
      memberId: row.memberId,
      number: row.number,
      code: this.formatCode(row.number),
      amount: row.amount,
      method: row.method,
      concept: row.concept,
      description: row.description,
      createdAt: row.createdAt,
    };
  }

  private formatCode(number: number): string {
    return `GB-${String(number).padStart(6, '0')}`;
  }
}
