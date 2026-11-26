import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaymentMethod, PaymentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { reserveProductSale } from '../products/product-sales';

export interface TransactionItemInput {
  packId?: string | null;
  sessionId?: string | null;
  productId?: string | null;
  productQuantity?: number;
  amount: number;
  listAmount?: number | null;
  discountBps?: number;
  idempotencyKey: string;
}

export interface InitiatePaymentParams {
  tenantId: string;
  memberId: string | null;
  billedTenantId?: string | null;
  method: PaymentMethod;
  items: TransactionItemInput[];
  recordedByStaffId?: string | null;
  transferReference?: string | null;
  mpPreferenceId?: string | null;
  mpInitPoint?: string | null;
  mpSandboxInitPoint?: string | null;
}

@Injectable()
export class TransactionService {
  constructor(private readonly prisma: PrismaService) {}

  async initiateTransaction(
    params: InitiatePaymentParams,
    tx?: Prisma.TransactionClient,
  ): Promise<
    Prisma.TransactionGetPayload<{ include: { transactionItems: true } }>
  > {
    if (!tx) {
      return this.prisma.$transaction((client) =>
        this.initiateTransaction(params, client),
      );
    }
    const {
      tenantId,
      memberId,
      billedTenantId,
      method,
      items,
      recordedByStaffId,
      transferReference,
      mpPreferenceId,
      mpInitPoint,
      mpSandboxInitPoint,
    } = params;
    if (!items.length) throw new BadRequestException('La venta no tiene ítems.');
    let totalAmount = 0;
    for (const item of items) {
      if (item.productId) {
        if (item.packId || item.sessionId) {
          throw new BadRequestException(
            'Un ítem de venta solo puede ser pack, drop-in o producto.',
          );
        }
        const quantity = item.productQuantity ?? 1;
        if (!Number.isSafeInteger(quantity) || quantity < 1) {
          throw new BadRequestException(
            'La cantidad debe ser un entero positivo.',
          );
        }
        const [product] = await tx.$queryRaw<
          { price: number; active: boolean }[]
        >`
          SELECT price, active FROM products
          WHERE id = ${item.productId}::uuid AND tenant_id = ${tenantId}::uuid`;
        if (!product) throw new NotFoundException('Producto no encontrado.');
        if (!product.active) {
          throw new BadRequestException('El producto está archivado.');
        }
        const listTotal = product.price * quantity;
        if (
          (item.listAmount ?? item.amount) !== listTotal ||
          item.amount < 1 ||
          item.amount > listTotal
        ) {
          throw new BadRequestException(
            'El precio del producto no coincide con el catálogo.',
          );
        }
        totalAmount += item.amount;
      } else {
        if (item.packId && item.sessionId) {
          throw new BadRequestException(
            'Un ítem no puede ser pack y drop-in a la vez.',
          );
        }
        totalAmount += item.amount;
      }
    }
    const transaction = await tx.transaction.create({
      data: {
        tenantId,
        memberId,
        amount: totalAmount,
        status: PaymentStatus.PENDING,
        idempotencyKey: items[0].idempotencyKey,
        recordedByStaffId: recordedByStaffId ?? null,
        billedTenantId: billedTenantId ?? null,
        transferReference: transferReference ?? null,
        mpPreferenceId,
        mpInitPoint,
        mpSandboxInitPoint,
      },
    });

    for (const item of items) {
      const saved = await tx.transactionItem.create({
        data: {
          tenantId,
          memberId,
          packId: item.packId ?? null,
          sessionId: item.sessionId ?? null,
          amount: item.amount,
          listAmount: item.listAmount ?? null,
          discountBps: item.discountBps ?? 0,
          status: PaymentStatus.PENDING,
          method,
          idempotencyKey: item.idempotencyKey,
          transactionId: transaction.id,
          mpPreferenceId,
          mpInitPoint,
          mpSandboxInitPoint,
        },
      });
      if (item.productId) {
        await reserveProductSale(
          tx,
          {
            tenantId,
            transactionItemId: saved.id,
            productId: item.productId,
            quantity: item.productQuantity ?? 1,
            staffUserId: recordedByStaffId ?? null,
          },
          method === PaymentMethod.MP,
        );
      }
    }

    return tx.transaction.findUniqueOrThrow({
      where: { id: transaction.id },
      include: { transactionItems: true },
    });
  }

  async confirmTransaction(
    transactionId: string,
    actor: { userId: string; profileType: string },
    tx?: Prisma.TransactionClient,
  ): Promise<
    Prisma.TransactionGetPayload<{ include: { transactionItems: true } }>
  > {
    void actor;
    const db = tx ?? this.prisma;
    if (tx) {
      await Promise.all([
        tx.transaction.update({
          where: { id: transactionId },
          data: { status: PaymentStatus.APPROVED },
        }),
        tx.transactionItem.updateMany({
          where: { transactionId },
          data: { status: PaymentStatus.APPROVED },
        }),
      ]);
    } else {
      await this.prisma.$transaction([
        this.prisma.transaction.update({
          where: { id: transactionId },
          data: { status: PaymentStatus.APPROVED },
        }),
        this.prisma.transactionItem.updateMany({
          where: { transactionId },
          data: { status: PaymentStatus.APPROVED },
        }),
      ]);
    }
    return db.transaction.findUniqueOrThrow({
      where: { id: transactionId },
      include: { transactionItems: true },
    });
  }

  async getTransaction(
    transactionId: string,
  ): Promise<
    Prisma.TransactionGetPayload<{ include: { transactionItems: true } }> | null
  > {
    return this.prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { transactionItems: true },
    });
  }
}
