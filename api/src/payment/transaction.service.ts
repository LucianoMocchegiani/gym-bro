import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentMethod, PaymentStatus } from '@prisma/client';

export interface TransactionItemInput {
  packId?: string | null;
  sessionId?: string | null;
  amount: number;
  idempotencyKey: string;
}

export interface InitiatePaymentParams {
  tenantId: string;
  memberId: string;
  method: PaymentMethod;
  items: TransactionItemInput[];
  recordedByStaffId?: string | null;
  mpPreferenceId?: string | null;
  mpInitPoint?: string | null;
  mpSandboxInitPoint?: string | null;
}

/**
 * Gestiona el ciclo de vida de Transactions y TransactionItems.
 *
 * @description
 * - Crea Transactions con sus TransactionItems asociados.
 * - Confirma Transactions (cambia status a APPROVED).
 * - Es agnóstico al método de pago (CASH, MP, STUB).
 *
 * @remarks
 * Los servicios de pago específico (CashPaymentService, OnlinePaymentService)
 * usan este servicio como base para crear/transacciones.
 */
@Injectable()
export class TransactionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crea una Transaction con sus TransactionItems.
   *
   * @param params - Parámetros de la transacción
   * @returns La Transaction creada con sus items
   */
  async initiateTransaction(
    params: InitiatePaymentParams,
  ): Promise<Prisma.TransactionGetPayload<{ include: { transactionItems: true } }>> {
    const { tenantId, memberId, method, items, recordedByStaffId, mpPreferenceId, mpInitPoint, mpSandboxInitPoint } = params;

    const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
    const firstItem = items[0];

    const transaction = await this.prisma.transaction.create({
      data: {
        tenantId,
        memberId,
        amount: totalAmount,
        status: PaymentStatus.PENDING,
        idempotencyKey: firstItem.idempotencyKey,
        recordedByStaffId: recordedByStaffId ?? null,
        mpPreferenceId,
        mpInitPoint,
        mpSandboxInitPoint,
      },
    });

    const transactionItems = await Promise.all(
      items.map((item) =>
        this.prisma.transactionItem.create({
          data: {
            tenantId,
            memberId,
            packId: item.packId ?? null,
            sessionId: item.sessionId ?? null,
            amount: item.amount,
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

    return this.prisma.transaction.findUniqueOrThrow({
      where: { id: transaction.id },
      include: { transactionItems: true },
    });
  }

  /**
   * Confirma una Transaction y sus TransactionItems (cambia a APPROVED).
   *
   * @param transactionId - ID de la transacción
   * @param actor - Usuario que confirma (para auditoría)
   */
  async confirmTransaction(
    transactionId: string,
    actor: { userId: string; profileType: string },
  ): Promise<Prisma.TransactionGetPayload<{ include: { transactionItems: true } }>> {
    const transaction = await this.prisma.transaction.findUniqueOrThrow({
      where: { id: transactionId },
      include: { transactionItems: true },
    });

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

  /**
   * Obtiene una Transaction por ID con sus items.
   */
  async getTransaction(
    transactionId: string,
  ): Promise<Prisma.TransactionGetPayload<{ include: { transactionItems: true } }> | null> {
    return this.prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { transactionItems: true },
    });
  }
}
