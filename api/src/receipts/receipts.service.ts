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
import {
  ListQueryDto,
  ListResult,
  normalizeListQuery,
  toListResult,
} from '../common/list';
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
   * Emite comprobante para un pago APPROVED (idempotente por transactionItemId).
   */
  async issueForApprovedPayment(
    tx: Tx,
    input: {
      tenantId: string;
      transactionItemId: string;
      memberId: string;
      amount: number;
      method: PaymentMethod;
      concept: ReceiptConcept;
      description?: string | null;
    },
  ): Promise<void> {
    const existing = await tx.receipt.findUnique({
      where: { transactionItemId: input.transactionItemId },
      select: { id: true },
    });
    if (existing) {
      return;
    }

    const number = await this.nextNumber(tx, input.tenantId);
    await tx.receipt.create({
      data: {
        tenantId: input.tenantId,
        transactionItemId: input.transactionItemId,
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
   * Lista comprobantes de un afiliado (paginado; más recientes primero).
   */
  async listByMember(
    tenantId: string,
    memberId: string,
    query: ListQueryDto = {},
  ): Promise<ListResult<ReceiptDetail>> {
    await this.assertMemberInTenant(tenantId, memberId);
    const n = normalizeListQuery(query);
    const where: Prisma.ReceiptWhereInput = { tenantId, memberId };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.receipt.findMany({
        where,
        orderBy: { createdAt: n.order },
        skip: n.skip,
        take: n.take,
      }),
      this.prisma.receipt.count({ where }),
    ]);
    return toListResult(
      rows.map((r) => this.toDetail(r)),
      total,
      n.page,
      n.pageSize,
    );
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
   * Comprobante asociado a un transactionItem del tenant.
   */
  async findByTransactionItem(
    tenantId: string,
    transactionItemId: string,
  ): Promise<ReceiptDetail> {
    const transactionItem = await this.prisma.transactionItem.findFirst({
      where: { id: transactionItemId, tenantId },
      select: { id: true, status: true },
    });
    if (!transactionItem) {
      throw new NotFoundException(`TransactionItem ${transactionItemId} not found in tenant`);
    }
    if (transactionItem.status !== PaymentStatus.APPROVED) {
      throw new ForbiddenException(
        'Receipt is only available for APPROVED payments',
      );
    }
    const receipt = await this.prisma.receipt.findUnique({
      where: { transactionItemId },
    });
    if (!receipt) {
      throw new NotFoundException(
        `Receipt for transactionItem ${transactionItemId} not found (legacy payment without receipt)`,
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
    transactionItemId: string;
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
      transactionItemId: row.transactionItemId,
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
