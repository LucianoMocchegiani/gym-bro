import { Injectable } from '@nestjs/common';
import { PaymentMethod } from '@prisma/client';
import { TransactionService, TransactionItemInput } from './transaction.service';
import { PaymentRegisterService } from '../payment-register/register.service';
import { CashMovementConcept, ReceiptConcept } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ReceiptsService } from '../receipts/receipts.service';
import { Prisma } from '@prisma/client';

type Tx = Prisma.TransactionClient;

export interface ProcessPaymentParams {
  tenantId: string;
  memberId: string;
  items: TransactionItemInput[];
  idempotencyKey: string;
  method: PaymentMethod;
  cashConcept: CashMovementConcept;
  receiptConcept: ReceiptConcept;
  description: string;
  recordedByStaffId?: string | null;
}

/**
 * Procesa pagos (CASH o STUB).
 *
 * @description
 * - Crea Transaction + TransactionItems (APPROVED para CASH/STUB)
 * - Si CASH: registra movimiento en caja y emite comprobante
 * - Si STUB: solo crea Transaction (sin movimiento de caja, para créditos manuales)
 *
 * @remarks
 * El caller debe wrapear la llamada en $transaction si necesita atomicidad
 * con otras operaciones (ej: crear Contract después del pago).
 */
@Injectable()
export class CashPaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly transactionService: TransactionService,
    private readonly registerService: PaymentRegisterService,
    private readonly receiptsService: ReceiptsService,
  ) {}

  /**
   * Procesa un pago.
   *
   * @param tx - Transacción Prisma existente (para atomicidad con otras operaciones)
   * @param params - Parámetros del pago
   * @returns La Transaction confirmada con sus items
   */
  async processPayment(
    tx: Tx,
    params: ProcessPaymentParams,
  ): Promise<{ transaction: Awaited<ReturnType<TransactionService['initiateTransaction']>> }> {
    const { tenantId, memberId, items, idempotencyKey, method, cashConcept, receiptConcept, description, recordedByStaffId } = params;

    const transaction = await this.transactionService.initiateTransaction({
      tenantId,
      memberId,
      method,
      items,
    });

    const confirmed = await this.transactionService.confirmTransaction(
      transaction.id,
      { userId: recordedByStaffId ?? 'system', profileType: 'SYSTEM' },
    );

    if (method === PaymentMethod.CASH) {
      for (const item of confirmed.transactionItems) {
        await this.registerService.recordIncome(tx, {
          tenantId,
          transactionItemId: item.id,
          memberId,
          amount: item.amount,
          method: PaymentMethod.CASH,
          concept: cashConcept,
          recordedByStaffId: recordedByStaffId ?? null,
        });

        await this.receiptsService.issueForApprovedPayment(tx, {
          tenantId,
          transactionItemId: item.id,
          memberId,
          amount: item.amount,
          method: PaymentMethod.CASH,
          concept: receiptConcept,
          description,
        });
      }
    }

    return { transaction: confirmed };
  }
}
