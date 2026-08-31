import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CashMovementConcept,
  ContractStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  RefundRequestStatus,
  ReservationStatus,
  ServiceType,
} from '@prisma/client';
import { AUDIT_ACTIONS, AuditActor } from '../audit/audit.types';
import { AuditService } from '../audit/audit.service';
import { PaymentRegisterService } from '../payment-register/register.service';
import { ReceiptsService } from '../receipts/receipts.service';
import { ListResult, normalizeListQuery, toListResult } from '../common/list';
import { MercadoPagoAccountService } from '../payment/mercadopago-account.service';
import { MP_ACCOUNT_PORT, MpAccountPort } from '../payment/mp-account.port';
import { PrismaService } from '../prisma/prisma.service';
import { WaitlistService } from '../waitlist/waitlist.service';
import {
  CreateRefundRequestDto,
  ExecuteRefundDto,
  ExecuteTransactionRefundDto,
  ListRefundRequestsQueryDto,
} from './dto/refund.dto';
import {
  RefundBatchExecutionDetail,
  RefundExecutionDetail,
  RefundRequestDetail,
} from './refunds.types';

const LIBRE_REFUND_HOURS = 24;

/**
 * Solicitudes y ejecución de devoluciones (CU-PAG-004/005/007).
 *
 * @remarks Política fija RN-PAG-012. Staff con `transaction_items.refund` puede
 * devolver siempre (RN-PAG-011). Devolución = lote de ítems de un cart
 * (un refund MP, un comprobante, un egreso en grilla).
 */
@Injectable()
export class RefundsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly cashRegister: PaymentRegisterService,
    private readonly receipts: ReceiptsService,
    private readonly accounts: MercadoPagoAccountService,
    private readonly waitlist: WaitlistService,
    @Inject(MP_ACCOUNT_PORT) private readonly mp: MpAccountPort,
  ) {}

  /**
   * Afiliado solicita devolución sobre un pago propio APPROVED.
   */
  async requestByMember(
    tenantId: string,
    memberId: string,
    transactionItemId: string,
    dto: CreateRefundRequestDto,
    actor: AuditActor,
  ): Promise<RefundRequestDetail> {
    const transactionItem = await this.loadPaymentForRefund(tenantId, transactionItemId);
    if (transactionItem.memberId !== memberId) {
      throw new ForbiddenException('TransactionItem does not belong to this member');
    }
    if (transactionItem.status === PaymentStatus.REFUNDED) {
      throw new BadRequestException('TransactionItem is already refunded');
    }
    if (transactionItem.status !== PaymentStatus.APPROVED) {
      throw new BadRequestException('Only APPROVED payments can be refunded');
    }

    const policy = this.evaluateMemberPolicy(transactionItem);
    const reason = dto.reason?.trim() || null;

    if (!policy.allowed) {
      const row = await this.prisma.refundRequest.create({
        data: {
          tenantId,
          transactionItemId,
          memberId,
          status: RefundRequestStatus.REJECTED,
          reason,
          rejectionReason: policy.reason,
          resolvedAt: new Date(),
        },
      });
      await this.audit.record({
        tenantId,
        actor,
        action: AUDIT_ACTIONS.refundRequestCreate,
        entityType: 'refund_request',
        entityId: row.id,
        after: {
          transactionItemId,
          status: row.status,
          rejectionReason: policy.reason,
        },
      });
      throw new BadRequestException(
        policy.reason ?? 'Refund request does not meet gym policy',
      );
    }

    const pending = await this.prisma.refundRequest.findFirst({
      where: {
        tenantId,
        transactionItemId,
        status: RefundRequestStatus.PENDING,
      },
    });
    if (pending) {
      return this.toRequestDetail(pending);
    }

    const row = await this.prisma.refundRequest.create({
      data: {
        tenantId,
        transactionItemId,
        memberId,
        status: RefundRequestStatus.PENDING,
        reason,
      },
    });

    await this.audit.record({
      tenantId,
      actor,
      action: AUDIT_ACTIONS.refundRequestCreate,
      entityType: 'refund_request',
      entityId: row.id,
      after: { transactionItemId, status: row.status, reason },
    });

    return this.toRequestDetail(row);
  }

  /**
   * Lista solicitudes del afiliado (paginado; más recientes primero).
   */
  async listMine(
    tenantId: string,
    memberId: string,
    query: ListRefundRequestsQueryDto = {},
  ): Promise<ListResult<RefundRequestDetail>> {
    const n = normalizeListQuery(query);
    const where: Prisma.RefundRequestWhereInput = {
      tenantId,
      memberId,
      ...(query.status ? { status: query.status } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.refundRequest.findMany({
        where,
        orderBy: { createdAt: n.order },
        skip: n.skip,
        take: n.take,
      }),
      this.prisma.refundRequest.count({ where }),
    ]);
    return toListResult(
      rows.map((r) => this.toRequestDetail(r)),
      total,
      n.page,
      n.pageSize,
    );
  }

  /**
   * Lista solicitudes del gym (paginado; staff; más recientes primero).
   */
  async listForTenant(
    tenantId: string,
    query: ListRefundRequestsQueryDto = {},
  ): Promise<ListResult<RefundRequestDetail>> {
    const n = normalizeListQuery(query);
    const where: Prisma.RefundRequestWhereInput = {
      tenantId,
      ...(query.status ? { status: query.status } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.refundRequest.findMany({
        where,
        orderBy: { createdAt: n.order },
        skip: n.skip,
        take: n.take,
      }),
      this.prisma.refundRequest.count({ where }),
    ]);
    return toListResult(
      rows.map((r) => this.toRequestDetail(r)),
      total,
      n.page,
      n.pageSize,
    );
  }

  /**
   * Staff ejecuta devolución de un ítem (wrapper del lote del cart).
   *
   * @remarks Idempotente si el ítem ya está REFUNDED. CU-PAG-005 / CU-PAG-007.
   */
  async execute(
    tenantId: string,
    transactionItemId: string,
    dto: ExecuteRefundDto,
    actor: AuditActor,
  ): Promise<RefundExecutionDetail> {
    const item = await this.loadPaymentForRefund(tenantId, transactionItemId);
    const batch = await this.executeForTransaction(
      tenantId,
      item.transactionId,
      { ...dto, transactionItemIds: [transactionItemId] },
      actor,
    );
    return this.toItemExecutionDetail(batch, transactionItemId, item);
  }

  /**
   * Staff ejecuta devolución de uno o más ítems APPROVED del mismo cart.
   *
   * @remarks Un refund a MP por la suma (parcial o el saldo). CASH/STUB igual
   * en caja. Ítems ya REFUNDED en un lote mixto → error; lote 100 %
   * REFUNDED → idempotente.
   */
  async executeForTransaction(
    tenantId: string,
    transactionId: string,
    dto: ExecuteTransactionRefundDto,
    actor: AuditActor,
  ): Promise<RefundBatchExecutionDetail> {
    if (actor.profileType !== 'STAFF' && actor.profileType !== 'SUPER') {
      throw new ForbiddenException('Staff or Super required to execute refund');
    }

    const itemIds = [...new Set(dto.transactionItemIds)];
    const reason = dto.reason.trim();
    const motiveCode = dto.motiveCode ?? null;

    const transaction = await this.prisma.transaction.findFirst({
      where: { id: transactionId, tenantId },
      include: {
        transactionItems: {
          where: { id: { in: itemIds } },
          include: {
            contract: {
              include: {
                balances: true,
                pack: {
                  include: {
                    components: { include: { service: true } },
                  },
                },
              },
            },
            reservation: true,
          },
        },
      },
    });
    if (!transaction) {
      throw new NotFoundException(
        `Transaction ${transactionId} not found in tenant`,
      );
    }
    if (transaction.transactionItems.length !== itemIds.length) {
      throw new BadRequestException(
        'All transactionItemIds must belong to this transaction',
      );
    }

    const items = transaction.transactionItems;
    const already = items.filter((i) => i.status === PaymentStatus.REFUNDED);
    const toRefund = items.filter((i) => i.status === PaymentStatus.APPROVED);

    if (toRefund.length === 0 && already.length === items.length) {
      return this.toBatchExecutionDetail({
        transactionId,
        items,
        amount: items.reduce((sum, i) => sum + i.amount, 0),
        method: items[0]?.method ?? PaymentMethod.CASH,
        reason: items[0]?.refundReason ?? reason,
        motiveCode,
        mpRefundManualPending: items.some((i) => i.mpRefundManualPending),
        receiptId: null,
        refundRequestIds: dto.refundRequestId ? [dto.refundRequestId] : [],
        refundedAt: (items[0]?.refundedAt ?? new Date()).toISOString(),
      });
    }
    if (already.length > 0) {
      throw new BadRequestException(
        'Some selected items are already refunded',
      );
    }
    if (toRefund.some((i) => i.status !== PaymentStatus.APPROVED)) {
      throw new BadRequestException('Only APPROVED items can be refunded');
    }

    const amount = toRefund.reduce((sum, i) => sum + i.amount, 0);
    const remaining = transaction.amount - transaction.refundedAmount;
    if (amount > remaining) {
      throw new BadRequestException(
        'Refund amount exceeds remaining transaction balance',
      );
    }

    const method = toRefund[0]?.method ?? PaymentMethod.CASH;
    let refundRequestId: string | null = dto.refundRequestId ?? null;
    if (refundRequestId) {
      const req = await this.prisma.refundRequest.findFirst({
        where: {
          id: refundRequestId,
          tenantId,
          transactionItemId: { in: itemIds },
        },
      });
      if (!req) {
        throw new NotFoundException('Refund request not found for payment');
      }
      if (req.status === RefundRequestStatus.EXECUTED) {
        return this.toBatchExecutionDetail({
          transactionId,
          items,
          amount,
          method,
          reason,
          motiveCode,
          mpRefundManualPending: false,
          receiptId: null,
          refundRequestIds: [req.id],
          refundedAt: (req.resolvedAt ?? new Date()).toISOString(),
        });
      }
    }

    let mpRefundManualPending = false;
    if (method === PaymentMethod.MP) {
      const mpPaymentId =
        transaction.mpPaymentId ??
        toRefund.find((i) => i.mpPaymentId)?.mpPaymentId ??
        null;
      if (!mpPaymentId) {
        mpRefundManualPending = true;
      } else {
        const idempotencyKey = `refund-${transactionId}-${[...itemIds].sort().join(',')}`;
        try {
          const accessToken =
            await this.accounts.getDecryptedAccessToken(tenantId);
          const result = await this.mp.refundPayment(
            accessToken,
            mpPaymentId,
            amount,
            idempotencyKey,
          );
          mpRefundManualPending = result.manualPending;
        } catch {
          mpRefundManualPending = true;
        }
      }
    }

    const staffId = actor.profileType === 'STAFF' ? actor.userId : null;
    const refundedAt = new Date();
    const sessionIdsForWaitlist: string[] = [];

    const { receiptId, refundRequestIds } = await this.prisma.$transaction(
      async (tx) => {
        const description =
          toRefund.length === 1
            ? `Devolución: ${toRefund[0]?.packId ? 'Pack' : 'Drop-in'}`
            : `Devolución: ${toRefund.length} ítems`;
        const receipt = await this.receipts.issueForRefund(tx, {
          tenantId,
          transactionId,
          memberId: transaction.memberId,
          amount,
          method,
          description,
        });

        for (const item of toRefund) {
          const pay = await tx.transactionItem.update({
            where: { id: item.id },
            data: {
              status: PaymentStatus.REFUNDED,
              refundedAt,
              refundReason: reason,
              mpRefundManualPending,
            },
            include: {
              contract: true,
              reservation: true,
            },
          });

          if (pay.contract && pay.contract.status === ContractStatus.ACTIVE) {
            await tx.contractCreditBalance.updateMany({
              where: { contractId: pay.contract.id },
              data: { remaining: 0 },
            });
            await tx.contract.update({
              where: { id: pay.contract.id },
              data: {
                status: ContractStatus.REFUNDED,
                hasAccessLibre: false,
              },
            });
          }

          if (
            pay.reservation &&
            pay.reservation.status === ReservationStatus.CONFIRMED
          ) {
            sessionIdsForWaitlist.push(pay.reservation.sessionId);
            await tx.reservation.update({
              where: { id: pay.reservation.id },
              data: { status: ReservationStatus.CANCELLED },
            });
            const dec = await tx.session.updateMany({
              where: {
                id: pay.reservation.sessionId,
                tenantId,
                bookedCount: { gt: 0 },
              },
              data: { bookedCount: { decrement: 1 } },
            });
            if (dec.count !== 1) {
              throw new BadRequestException(
                'Session bookedCount could not be decremented',
              );
            }
          }

          await this.cashRegister.recordOutcome(tx, {
            tenantId,
            transactionItemId: pay.id,
            memberId: pay.memberId,
            amount: pay.amount,
            concept: CashMovementConcept.REFUND,
            recordedByStaffId: staffId,
            at: refundedAt,
            receiptId: receipt.id,
          });
        }

        const newRefundedAmount = transaction.refundedAmount + amount;
        const remainingItems = await tx.transactionItem.count({
          where: {
            transactionId,
            status: { not: PaymentStatus.REFUNDED },
          },
        });
        await tx.transaction.update({
          where: { id: transactionId },
          data: {
            refundedAmount: newRefundedAmount,
            status:
              remainingItems === 0
                ? PaymentStatus.REFUNDED
                : transaction.status,
          },
        });

        const pendingReqs = await tx.refundRequest.findMany({
          where: {
            tenantId,
            transactionItemId: { in: itemIds },
            status: RefundRequestStatus.PENDING,
          },
          select: { id: true },
        });
        const executedIds = [
          ...new Set([
            ...(refundRequestId ? [refundRequestId] : []),
            ...pendingReqs.map((r) => r.id),
          ]),
        ];
        if (executedIds.length > 0) {
          await tx.refundRequest.updateMany({
            where: { id: { in: executedIds }, tenantId },
            data: {
              status: RefundRequestStatus.EXECUTED,
              resolvedAt: refundedAt,
              resolvedByStaffId: staffId,
            },
          });
        }

        return { receiptId: receipt.id, refundRequestIds: executedIds };
      },
    );

    for (const sessionId of [...new Set(sessionIdsForWaitlist)]) {
      await this.waitlist.tryPromoteForSession(tenantId, sessionId, 1, actor);
    }

    await this.audit.record({
      tenantId,
      actor,
      action: AUDIT_ACTIONS.paymentRefund,
      entityType: 'transaction',
      entityId: transactionId,
      after: {
        transactionItemIds: itemIds,
        status: PaymentStatus.REFUNDED,
        reason,
        motiveCode,
        mpRefundManualPending,
        receiptId,
        refundRequestIds,
      },
    });

    return this.toBatchExecutionDetail({
      transactionId,
      items: toRefund,
      amount,
      method,
      reason,
      motiveCode,
      mpRefundManualPending,
      receiptId,
      refundRequestIds,
      refundedAt: refundedAt.toISOString(),
    });
  }

  /**
   * Evalúa política afiliado RN-PAG-012 (defaults fijos).
   */
  private evaluateMemberPolicy(transactionItem: {
    id: string;
    createdAt: Date;
    packId: string | null;
    contract: {
      id: string;
      balances: { initialAmount: number; remaining: number }[];
      pack: {
        components: { service: { type: ServiceType } }[];
      };
    } | null;
    reservation: { id: string; status: ReservationStatus } | null;
  }): { allowed: boolean; reason: string | null } {
    const withinLibreWindow =
      Date.now() - transactionItem.createdAt.getTime() <=
      LIBRE_REFUND_HOURS * 60 * 60 * 1000;

    if (transactionItem.reservation) {
      if (!withinLibreWindow) {
        return {
          allowed: false,
          reason: 'Drop-in refund only within 24 hours of payment',
        };
      }
      return { allowed: true, reason: null };
    }

    if (!transactionItem.contract || !transactionItem.packId) {
      return {
        allowed: false,
        reason: 'TransactionItem has no contract or reservation to refund',
      };
    }

    const types = new Set(
      transactionItem.contract.pack.components.map((c) => c.service.type),
    );
    const hasLibre = types.has(ServiceType.ACCESO_LIBRE);
    const hasSessions = types.has(ServiceType.POR_SESIONES);
    const creditsUntouched = transactionItem.contract.balances.every(
      (b) => b.remaining === b.initialAmount,
    );

    if (hasLibre && !hasSessions) {
      if (!withinLibreWindow) {
        return {
          allowed: false,
          reason: 'Access pack refund only within 24 hours of payment',
        };
      }
      return { allowed: true, reason: null };
    }

    if (hasSessions && !hasLibre) {
      if (!creditsUntouched) {
        return {
          allowed: false,
          reason: 'Session pack refund requires unused credits',
        };
      }
      return { allowed: true, reason: null };
    }

    // Mixto: ambas condiciones
    if (!withinLibreWindow) {
      return {
        allowed: false,
        reason: 'Mixed pack refund only within 24 hours of payment',
      };
    }
    if (!creditsUntouched) {
      return {
        allowed: false,
        reason: 'Mixed pack refund requires unused credits',
      };
    }
    return { allowed: true, reason: null };
  }

  private async loadPaymentForRefund(tenantId: string, transactionItemId: string) {
    const transactionItem = await this.prisma.transactionItem.findFirst({
      where: { id: transactionItemId, tenantId },
      include: {
        contract: {
          include: {
            balances: true,
            pack: {
              include: {
                components: { include: { service: true } },
              },
            },
          },
        },
        reservation: true,
      },
    });
    if (!transactionItem) {
      throw new NotFoundException(`TransactionItem ${transactionItemId} not found in tenant`);
    }
    return transactionItem;
  }

  private toRequestDetail(row: {
    id: string;
    tenantId: string;
    transactionItemId: string;
    memberId: string;
    status: RefundRequestStatus;
    reason: string | null;
    rejectionReason: string | null;
    resolvedByStaffId: string | null;
    resolvedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): RefundRequestDetail {
    return {
      id: row.id,
      tenantId: row.tenantId,
      transactionItemId: row.transactionItemId,
      memberId: row.memberId,
      status: row.status,
      reason: row.reason,
      rejectionReason: row.rejectionReason,
      resolvedByStaffId: row.resolvedByStaffId,
      resolvedAt: row.resolvedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toBatchExecutionDetail(input: {
    transactionId: string;
    items: Array<{ id: string }>;
    amount: number;
    method: PaymentMethod;
    reason: string;
    motiveCode: string | null;
    mpRefundManualPending: boolean;
    receiptId: string | null;
    refundRequestIds: string[];
    refundedAt: string;
  }): RefundBatchExecutionDetail {
    return {
      transactionId: input.transactionId,
      transactionItemIds: input.items.map((i) => i.id),
      status: 'REFUNDED',
      method: input.method,
      amount: input.amount,
      reason: input.reason,
      motiveCode: input.motiveCode,
      mpRefundManualPending: input.mpRefundManualPending,
      receiptId: input.receiptId,
      refundRequestIds: input.refundRequestIds,
      refundedAt: input.refundedAt,
    };
  }

  private toItemExecutionDetail(
    batch: RefundBatchExecutionDetail,
    transactionItemId: string,
    item: {
      contract: { id: string } | null;
      reservation: { id: string } | null;
    },
  ): RefundExecutionDetail {
    return {
      transactionId: batch.transactionId,
      transactionItemId,
      transactionItemIds: batch.transactionItemIds,
      status: 'REFUNDED',
      method: batch.method,
      amount: batch.amount,
      reason: batch.reason,
      motiveCode: batch.motiveCode,
      mpRefundManualPending: batch.mpRefundManualPending,
      contractId: item.contract?.id ?? null,
      reservationId: item.reservation?.id ?? null,
      refundRequestId: batch.refundRequestIds[0] ?? null,
      receiptId: batch.receiptId,
      refundedAt: batch.refundedAt,
    };
  }
}
