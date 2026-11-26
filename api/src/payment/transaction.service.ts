import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentMethod, PaymentStatus } from '@prisma/client';

export interface TransactionItemInput {
  packId?: string | null;
  sessionId?: string | null;
  amount: number;
  /** Precio de lista cuando `amount` tiene descuento (RN-PAG-020). */
  listAmount?: number | null;
  discountBps?: number;
  idempotencyKey: string;
}

export interface InitiatePaymentParams {
  /** Tenant dueño del cobro (en ventas de plataforma, `admin`). */
  tenantId: string;
  /** Afiliado cobrador. Null cuando el tenant mismo abona. */
  memberId: string | null;
  /** Venta de plataforma: gym que recibe el contrato TENANT. */
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
  ): Promise<Prisma.TransactionGetPayload<{ include: { transactionItems: true } }>> {
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
    const db = tx ?? this.prisma;
    const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
    const firstItem = items[0];
    const transaction = await db.transaction.create({
      data: {
        tenantId,
        memberId,
        amount: totalAmount,
        status: PaymentStatus.PENDING,
        idempotencyKey: firstItem.idempotencyKey,
        recordedByStaffId: recordedByStaffId ?? null,
        billedTenantId: billedTenantId ?? null,
        transferReference: transferReference ?? null,
        mpPreferenceId,
        mpInitPoint,
        mpSandboxInitPoint,
      },
    });

    await Promise.all(
      items.map((item) =>
        db.transactionItem.create({
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
        }),
      ),
    );

    return db.transaction.findUniqueOrThrow({
      where: { id: transaction.id },
      include: { transactionItems: true },
    });
  }

  async confirmTransaction(
    transactionId: string,
    actor: { userId: string; profileType: string },
    tx?: Prisma.TransactionClient,
  ): Promise<Prisma.TransactionGetPayload<{ include: { transactionItems: true } }>> {
    void actor;
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
      return tx.transaction.findUniqueOrThrow({
        where: { id: transactionId },
        include: { transactionItems: true },
      });
    }

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
    return this.prisma.transaction.findUniqueOrThrow({
      where: { id: transactionId },
      include: { transactionItems: true },
    });
  }

  async getTransaction(
    transactionId: string,
  ): Promise<Prisma.TransactionGetPayload<{
    include: { transactionItems: true };
  }> | null> {
    return this.prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { transactionItems: true },
    });
  }
}
