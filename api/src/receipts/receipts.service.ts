import {
  BadRequestException,
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
import {
  PAYMENT_LINE_INCLUDE,
  toPaymentLine,
  type PaymentLineDetail,
} from '../payment/payment-line';

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
   * Emite comprobante para un pago APPROVED (idempotente por transactionItemId o transactionId).
   *
   * @remarks Cobros actuales (CASH y MP) usan `transactionId` (1 comprobante por cart).
   * `transactionItemId` queda para comprobantes legacy.
   */
  async issueForApprovedPayment(
    tx: Tx,
    input: {
      tenantId: string;
      transactionItemId?: string;
      transactionId?: string;
      memberId: string;
      amount: number;
      method: PaymentMethod;
      concept: ReceiptConcept;
      description?: string | null;
    },
  ): Promise<void> {
    if (input.transactionId) {
      const existing = await tx.receipt.findUnique({
        where: { transactionId: input.transactionId },
        select: { id: true },
      });
      if (existing) return;
    } else if (input.transactionItemId) {
      const existing = await tx.receipt.findUnique({
        where: { transactionItemId: input.transactionItemId },
        select: { id: true },
      });
      if (existing) return;
    } else {
      throw new BadRequestException('Must provide either transactionItemId or transactionId');
    }

    const number = await this.nextNumber(tx, input.tenantId);
    await tx.receipt.create({
      data: {
        tenantId: input.tenantId,
        transactionItemId: input.transactionItemId ?? null,
        transactionId: input.transactionId ?? null,
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
   * Emite comprobante de devolución para un payment refunded.
   * idempotente por transactionItemId.
   */
  async issueForRefund(
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
      await this.withLines(tenantId, rows),
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
    const [detail] = await this.withLines(tenantId, [receipt]);
    if (!detail) {
      throw new NotFoundException(`Receipt ${receiptId} not found in tenant`);
    }
    return detail;
  }

  /**
   * Comprobante asociado a una transacción APPROVED (1 por cart).
   *
   * @remarks Si no hay receipt con `transactionId` (cobros legacy 1:1 con el ítem),
   * busca el único receipt de los transaction_items de esa transacción.
   */
  async findByTransactionId(
    tenantId: string,
    transactionId: string,
  ): Promise<ReceiptDetail> {
    const transaction = await this.prisma.transaction.findFirst({
      where: { id: transactionId, tenantId },
      select: { id: true, status: true },
    });
    if (!transaction) {
      throw new NotFoundException(`Transaction ${transactionId} not found in tenant`);
    }
    if (transaction.status !== PaymentStatus.APPROVED) {
      throw new ForbiddenException(
        'Receipt is only available for APPROVED transactions',
      );
    }
    const receipt = await this.prisma.receipt.findUnique({
      where: { transactionId },
    });
    if (receipt) {
      const [detail] = await this.withLines(tenantId, [receipt]);
      if (!detail) {
        throw new NotFoundException(
          `Receipt for transaction ${transactionId} not found`,
        );
      }
      return detail;
    }
    const itemReceipts = await this.prisma.receipt.findMany({
      where: {
        tenantId,
        transactionItem: { transactionId },
      },
      take: 2,
    });
    if (itemReceipts.length === 1 && itemReceipts[0]) {
      const [detail] = await this.withLines(tenantId, [itemReceipts[0]]);
      if (!detail) {
        throw new NotFoundException(
          `Receipt for transaction ${transactionId} not found`,
        );
      }
      return detail;
    }
    throw new NotFoundException(
      `Receipt for transaction ${transactionId} not found`,
    );
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

  /**
   * Adjunta líneas comerciales a comprobantes (un query de ítems por lote).
   */
  private async withLines(
    tenantId: string,
    rows: Array<{
      id: string;
      tenantId: string;
      transactionItemId: string | null;
      transactionId: string | null;
      memberId: string;
      number: number;
      amount: number;
      method: PaymentMethod;
      concept: ReceiptConcept;
      description: string | null;
      createdAt: Date;
    }>,
  ): Promise<ReceiptDetail[]> {
    if (rows.length === 0) {
      return [];
    }
    const txIds = [
      ...new Set(
        rows
          .map((r) => r.transactionId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const orphanItemIds = rows
      .filter((r) => !r.transactionId && r.transactionItemId)
      .map((r) => r.transactionItemId)
      .filter((id): id is string => Boolean(id));

    const items =
      txIds.length > 0 || orphanItemIds.length > 0
        ? await this.prisma.transactionItem.findMany({
            where: {
              tenantId,
              OR: [
                ...(txIds.length > 0 ? [{ transactionId: { in: txIds } }] : []),
                ...(orphanItemIds.length > 0
                  ? [{ id: { in: orphanItemIds } }]
                  : []),
              ],
            },
            orderBy: { createdAt: 'asc' },
            include: PAYMENT_LINE_INCLUDE,
          })
        : [];

    const byTx = new Map<string, PaymentLineDetail[]>();
    const byItem = new Map<string, PaymentLineDetail>();
    for (const item of items) {
      const line = toPaymentLine(item);
      byItem.set(item.id, line);
      if (item.transactionId) {
        const list = byTx.get(item.transactionId) ?? [];
        list.push(line);
        byTx.set(item.transactionId, list);
      }
    }

    return rows.map((row) => {
      let lines: PaymentLineDetail[] = [];
      if (row.transactionId) {
        lines = byTx.get(row.transactionId) ?? [];
      } else if (row.transactionItemId) {
        const line = byItem.get(row.transactionItemId);
        lines = line ? [line] : [];
      }
      return {
        id: row.id,
        tenantId: row.tenantId,
        transactionItemId: row.transactionItemId,
        transactionId: row.transactionId,
        memberId: row.memberId,
        number: row.number,
        code: this.formatCode(row.number),
        amount: row.amount,
        method: row.method,
        concept: row.concept,
        description: row.description,
        createdAt: row.createdAt,
        lines,
      };
    });
  }

  private formatCode(number: number): string {
    return `GB-${String(number).padStart(6, '0')}`;
  }
}
