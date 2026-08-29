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
import { ListResult, normalizeListQuery, toListResult } from '../common/list';
import { MercadoPagoAccountService } from '../payment/mercadopago-account.service';
import { MP_ACCOUNT_PORT, MpAccountPort } from '../payment/mp-account.port';
import { PrismaService } from '../prisma/prisma.service';
import { WaitlistService } from '../waitlist/waitlist.service';
import {
  CreateRefundRequestDto,
  ExecuteRefundDto,
  ListRefundRequestsQueryDto,
} from './dto/refund.dto';
import { RefundExecutionDetail, RefundRequestDetail } from './refunds.types';

const LIBRE_REFUND_HOURS = 24;

/**
 * Solicitudes y ejecución de devoluciones (CU-PAG-004/005/007).
 *
 * @remarks Política fija RN-PAG-012. Staff con `transaction_items.refund` puede
 * devolver siempre (RN-PAG-011). Sin comprobante de devolución ni N1 E9.
 */
@Injectable()
export class RefundsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly cashRegister: PaymentRegisterService,
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
   * Staff ejecuta devolución total (directa o desde solicitud).
   *
   * @remarks Idempotente si el pago ya está REFUNDED.
   */
  async execute(
    tenantId: string,
    transactionItemId: string,
    dto: ExecuteRefundDto,
    actor: AuditActor,
  ): Promise<RefundExecutionDetail> {
    if (actor.profileType !== 'STAFF' && actor.profileType !== 'SUPER') {
      throw new ForbiddenException('Staff or Super required to execute refund');
    }

    const transactionItem = await this.loadPaymentForRefund(tenantId, transactionItemId);

    if (transactionItem.status === PaymentStatus.REFUNDED) {
      return this.toExecutionDetail(transactionItem, dto, null);
    }
    if (transactionItem.status !== PaymentStatus.APPROVED) {
      throw new BadRequestException('Only APPROVED payments can be refunded');
    }

    const reason = dto.reason.trim();
    const motiveCode = dto.motiveCode ?? null;
    let refundRequestId: string | null = dto.refundRequestId ?? null;

    if (refundRequestId) {
      const req = await this.prisma.refundRequest.findFirst({
        where: { id: refundRequestId, tenantId, transactionItemId },
      });
      if (!req) {
        throw new NotFoundException('Refund request not found for payment');
      }
      if (req.status === RefundRequestStatus.EXECUTED) {
        return this.toExecutionDetail(transactionItem, dto, req.id);
      }
    } else {
      const pending = await this.prisma.refundRequest.findFirst({
        where: {
          tenantId,
          transactionItemId,
          status: RefundRequestStatus.PENDING,
        },
      });
      refundRequestId = pending?.id ?? null;
    }

    let mpRefundManualPending = false;
    if (transactionItem.method === PaymentMethod.MP) {
      if (!transactionItem.mpPaymentId) {
        mpRefundManualPending = true;
      } else {
        try {
          const accessToken =
            await this.accounts.getDecryptedAccessToken(tenantId);
          const result = await this.mp.refundPayment(
            accessToken,
            transactionItem.mpPaymentId,
            transactionItem.amount,
          );
          mpRefundManualPending = result.manualPending;
        } catch {
          mpRefundManualPending = true;
        }
      }
    }

    const staffId = actor.profileType === 'STAFF' ? actor.userId : null;
    const refundedAt = new Date();
    let sessionIdForWaitlist: string | null = null;

    const updated = await this.prisma.$transaction(async (tx) => {
      const pay = await tx.transactionItem.update({
        where: { id: transactionItem.id },
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
        sessionIdForWaitlist = pay.reservation.sessionId;
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
      });

      if (refundRequestId) {
        await tx.refundRequest.update({
          where: { id: refundRequestId },
          data: {
            status: RefundRequestStatus.EXECUTED,
            resolvedAt: refundedAt,
            resolvedByStaffId: staffId,
          },
        });
      }

      return pay;
    });

    if (sessionIdForWaitlist) {
      await this.waitlist.tryPromoteForSession(
        tenantId,
        sessionIdForWaitlist,
        1,
        actor,
      );
    }

    await this.audit.record({
      tenantId,
      actor,
      action: AUDIT_ACTIONS.paymentRefund,
      entityType: 'payment',
      entityId: updated.id,
      after: {
        status: PaymentStatus.REFUNDED,
        reason,
        motiveCode,
        mpRefundManualPending,
        refundRequestId,
        contractId: updated.contract?.id ?? null,
        reservationId: updated.reservation?.id ?? null,
      },
    });

    return this.toExecutionDetail(
      {
        ...updated,
        refundedAt,
        refundReason: reason,
        mpRefundManualPending,
      },
      dto,
      refundRequestId,
    );
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

  private toExecutionDetail(
    transactionItem: {
      id: string;
      method: PaymentMethod;
      amount: number;
      refundReason: string | null;
      mpRefundManualPending: boolean;
      refundedAt: Date | null;
      contract: { id: string } | null;
      reservation: { id: string } | null;
    },
    dto: ExecuteRefundDto,
    refundRequestId: string | null,
  ): RefundExecutionDetail {
    return {
      transactionItemId: transactionItem.id,
      status: 'REFUNDED',
      method: transactionItem.method,
      amount: transactionItem.amount,
      reason: transactionItem.refundReason ?? dto.reason,
      motiveCode: dto.motiveCode ?? null,
      mpRefundManualPending: transactionItem.mpRefundManualPending,
      contractId: transactionItem.contract?.id ?? null,
      reservationId: transactionItem.reservation?.id ?? null,
      refundRequestId,
      refundedAt: (transactionItem.refundedAt ?? new Date()).toISOString(),
    };
  }
}
