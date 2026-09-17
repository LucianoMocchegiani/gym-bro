import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ContractStatus,
  MemberStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  Reservation,
  ReservationCoverage,
  ReservationStatus,
  SessionStatus,
} from '@prisma/client';
import { AUDIT_ACTIONS, AuditActor } from '../audit/audit.types';
import { AuditService } from '../audit/audit.service';
import {
  ListResult,
  normalizeListQuery,
  resolveOrderField,
  toListResult,
} from '../common/list';
import { PrismaService } from '../prisma/prisma.service';
import { TenantSettingsService } from '../tenant-settings/tenant-settings.service';
import { WaitlistService } from '../waitlist/waitlist.service';
import {
  CreateReservationDto,
  ListReservationsQueryDto,
  UpdateReservationStatusDto,
} from './dto/reservation.dto';
import { ReservationDetail } from './reservations.types';

/** Whitelist de orden para {@link ReservationsService.listByMember}. */
const RESERVATION_ORDER_FIELDS = ['startsAt', 'createdAt'] as const;

type ReservationWithRelations = Reservation & {
  member: { id: string; name: string | null; email: string };
  session: {
    id: string;
    startsAt: Date;
    endsAt: Date;
    serviceId: string;
    service: { id: string; name: string };
  };
  transactionItem: {
    id: string;
    amount: number;
    method: PaymentMethod;
    status: PaymentStatus;
  } | null;
};

/**
 * Reservas con crÃ©dito o drop-in (CU-RES-001 / CU-RES-002 / RN-RES-001)
 * y cancelaciÃ³n (CU-RES-003).
 *
 * @remarks Drop-in: staff-only vÃ­a Caja o Mercado Pago. CASH â†’ movimiento
 * de caja. Comprobante interno RN-PAG-009. CancelaciÃ³n: CREDIT devuelve crÃ©dito;
 * DROP_IN no reembolsa (E5). Ingreso tardÃ­o RN-RES-006.
 */
@Injectable()
export class ReservationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly tenantSettings: TenantSettingsService,
    private readonly waitlist: WaitlistService,
  ) {}

  /**
   * Lista reservas de un afiliado (paginado; prÃ³ximas primero por defecto).
   */
  async listByMember(
    tenantId: string,
    memberId: string,
    query: ListReservationsQueryDto = {},
  ): Promise<ListResult<ReservationDetail>> {
    await this.assertMemberInTenant(tenantId, memberId);
    const n = normalizeListQuery(query);
    const orderField = resolveOrderField(
      n.orderBy,
      RESERVATION_ORDER_FIELDS,
      'startsAt',
    );
    const orderBy: Prisma.ReservationOrderByWithRelationInput =
      orderField === 'startsAt'
        ? { session: { startsAt: n.order } }
        : { createdAt: n.order };
    const where: Prisma.ReservationWhereInput = {
      tenantId,
      memberId,
      ...(query.status ? { status: query.status } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.reservation.findMany({
        where,
        include: this.reservationInclude(),
        orderBy,
        skip: n.skip,
        take: n.take,
      }),
      this.prisma.reservation.count({ where }),
    ]);
    return toListResult(
      rows.map((r) => this.toDetail(r)),
      total,
      n.page,
      n.pageSize,
    );
  }

  /**
   * Roster de una sesiÃ³n (paginado; confirmadas primero por defecto vÃ­a filtro).
   *
   * @remarks Staff `reservations.write`. Default UI: `status=CONFIRMED`.
   */
  async listBySession(
    tenantId: string,
    sessionId: string,
    query: ListReservationsQueryDto = {},
  ): Promise<ListResult<ReservationDetail>> {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, tenantId },
      select: { id: true },
    });
    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found in tenant`);
    }

    const n = normalizeListQuery(query);
    const orderField = resolveOrderField(
      n.orderBy,
      RESERVATION_ORDER_FIELDS,
      'createdAt',
    );
    const orderBy: Prisma.ReservationOrderByWithRelationInput =
      orderField === 'startsAt'
        ? { session: { startsAt: n.order } }
        : { createdAt: n.order };
    const where: Prisma.ReservationWhereInput = {
      tenantId,
      sessionId,
      ...(query.status ? { status: query.status } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.reservation.findMany({
        where,
        include: this.reservationInclude(),
        orderBy,
        skip: n.skip,
        take: n.take,
      }),
      this.prisma.reservation.count({ where }),
    ]);
    return toListResult(
      rows.map((r) => this.toDetail(r)),
      total,
      n.page,
      n.pageSize,
    );
  }

  /**
   * Confirma reserva con crÃ©dito (CU-RES-001).
   *
   * @remarks Drop-in de caja/MP crea un pack ONE_TIME y reserva CREDIT.
   */
  async createForMember(
    tenantId: string,
    memberId: string,
    dto: CreateReservationDto,
    actor: AuditActor,
  ): Promise<ReservationDetail> {
    if (dto.coverage === ReservationCoverage.DROP_IN) {
      throw new BadRequestException(
        'Use Caja or Mercado Pago for drop-in (ONE_TIME pack + credit reservation)',
      );
    }
    return this.createWithCredit(tenantId, memberId, dto, actor);
  }

  /**
   * Confirma reserva consumiendo 1 crÃ©dito del servicio de la sesiÃ³n.
   *
   * @remarks Elige saldo con `expiresAt` mÃ¡s prÃ³ximo (nulls al final).
   * Incrementa `bookedCount` de forma condicional para evitar overbooking.
   * Si la sesiÃ³n ya iniciÃ³, solo permite si el gym tiene ingreso tardÃ­o ON y
   * `endsAt` es futuro (CU-RES-006).
   */
  private async createWithCredit(
    tenantId: string,
    memberId: string,
    dto: CreateReservationDto,
    actor: AuditActor,
  ): Promise<ReservationDetail> {
    await this.assertMemberInTenant(tenantId, memberId, true);

    const session = await this.prisma.session.findFirst({
      where: { id: dto.sessionId, tenantId },
      select: {
        id: true,
        serviceId: true,
        status: true,
        startsAt: true,
        endsAt: true,
        capacity: true,
        bookedCount: true,
      },
    });
    if (!session) {
      throw new NotFoundException(
        `Session ${dto.sessionId} not found in tenant`,
      );
    }
    if (session.status !== SessionStatus.PUBLISHED) {
      throw new BadRequestException('Session is not published');
    }
    await this.tenantSettings.assertSessionOpenForBooking(tenantId, session);
    if (session.bookedCount >= session.capacity) {
      throw new BadRequestException('Session is full');
    }

    const existing = await this.prisma.reservation.findFirst({
      where: {
        tenantId,
        memberId,
        sessionId: session.id,
        status: ReservationStatus.CONFIRMED,
      },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException(
        'Member already has a confirmed reservation for this session',
      );
    }

    const credit = await this.pickCreditBalance(
      tenantId,
      memberId,
      session.serviceId,
      dto.contractId,
    );

    try {
      const reservation = await this.prisma.$transaction(async (tx) => {
        const fresh = await tx.session.findFirst({
          where: { id: session.id, tenantId },
          select: {
            id: true,
            status: true,
            capacity: true,
            bookedCount: true,
            startsAt: true,
            endsAt: true,
          },
        });
        if (!fresh || fresh.status !== SessionStatus.PUBLISHED) {
          throw new BadRequestException('Session is not published');
        }
        await this.tenantSettings.assertSessionOpenForBooking(tenantId, fresh);
        if (fresh.bookedCount >= fresh.capacity) {
          throw new BadRequestException('Session is full');
        }

        const seat = await tx.session.updateMany({
          where: {
            id: fresh.id,
            tenantId,
            status: SessionStatus.PUBLISHED,
            bookedCount: fresh.bookedCount,
          },
          data: { bookedCount: { increment: 1 } },
        });
        if (seat.count !== 1) {
          throw new ConflictException(
            'Session capacity changed concurrently; retry',
          );
        }

        const debit = await tx.contractCreditBalance.updateMany({
          where: {
            id: credit.id,
            remaining: { gt: 0 },
          },
          data: { remaining: { decrement: 1 } },
        });
        if (debit.count !== 1) {
          throw new BadRequestException(
            'No credit remaining on selected balance',
          );
        }

        return tx.reservation.create({
          data: {
            tenantId,
            memberId,
            sessionId: session.id,
            contractId: credit.contractId,
            creditBalanceId: credit.id,
            status: ReservationStatus.CONFIRMED,
            coverage: ReservationCoverage.CREDIT,
          },
          include: this.reservationInclude(),
        });
      });

      const detail = this.toDetail(reservation);
      await this.audit.record({
        tenantId,
        actor,
        action: AUDIT_ACTIONS.reservationCreate,
        entityType: 'reservation',
        entityId: reservation.id,
        before: null,
        after: this.auditSnapshot(detail),
      });
      return detail;
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Member already has a confirmed reservation for this session',
        );
      }
      throw error;
    }
  }


  /**
   * Cancela reservas CONFIRMED de una sesión que el gym acaba de cancelar.
   *
   * @remarks Devuelve crédito (incl. drop-in ONE_TIME). No promociona waitlist.
   * No aplica ventana del socio. No toca reservas si la clase ya empezó.
   */
  async cancelReservationsForGymCancelledSession(
    tenantId: string,
    sessionId: string,
    actor: AuditActor,
  ): Promise<void> {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, tenantId },
      select: { id: true, startsAt: true },
    });
    if (!session || session.startsAt.getTime() <= Date.now()) {
      return;
    }

    const rows = await this.prisma.reservation.findMany({
      where: {
        tenantId,
        sessionId,
        status: ReservationStatus.CONFIRMED,
      },
      include: this.reservationInclude(),
    });

    for (const before of rows) {
      await this.prisma.$transaction(async (tx) => {
        const updated = await tx.reservation.updateMany({
          where: {
            id: before.id,
            tenantId,
            status: ReservationStatus.CONFIRMED,
          },
          data: { status: ReservationStatus.CANCELLED },
        });
        if (updated.count !== 1) {
          return;
        }
        await tx.session.updateMany({
          where: { id: sessionId, tenantId, bookedCount: { gt: 0 } },
          data: { bookedCount: { decrement: 1 } },
        });
        if (before.creditBalanceId) {
          await tx.contractCreditBalance.update({
            where: { id: before.creditBalanceId },
            data: { remaining: { increment: 1 } },
          });
        }
      });
      await this.audit.record({
        tenantId,
        actor,
        action: AUDIT_ACTIONS.reservationCancel,
        entityType: 'reservation',
        entityId: before.id,
        before: this.auditSnapshot(this.toDetail(before)),
        after: null,
      });
    }
  }


  /**
   * Cancela una reserva confirmada (CU-RES-003 / RN-RES-003 / RN-TEN-005).
   *
   * @remarks Libera cupo. Si coverage CREDIT, devuelve 1 crÃ©dito. DROP_IN no
   * reembolsa el pago (E5). Invoca waitlist AUTO_ASSIGN. Idempotente si ya CANCELLED.
   * @param ownerMemberId Si se indica, exige que la reserva pertenezca a ese afiliado.
   *   El afiliado (actor MEMBER) valida la ventana de horas del gym; Staff/Super no.
   */
  async cancel(
    tenantId: string,
    reservationId: string,
    dto: UpdateReservationStatusDto,
    actor: AuditActor,
    ownerMemberId?: string,
  ): Promise<ReservationDetail> {
    if (dto.status !== ReservationStatus.CANCELLED) {
      throw new BadRequestException('Only CANCELLED status is supported');
    }

    const before = await this.findInTenant(tenantId, reservationId);
    if (ownerMemberId && before.memberId !== ownerMemberId) {
      throw new NotFoundException(
        `Reservation ${reservationId} not found in tenant`,
      );
    }
    if (before.status === ReservationStatus.CANCELLED) {
      return this.toDetail(before);
    }

    const startsAt = before.session.startsAt;
    if (startsAt.getTime() <= Date.now()) {
      throw new BadRequestException(
        'Cannot cancel a reservation after the session has started',
      );
    }

    const enforceWindow = actor.profileType === 'MEMBER';
    if (enforceWindow) {
      const hours = await this.tenantSettings.getCancellationHours(tenantId);
      const deadlineMs = startsAt.getTime() - hours * 60 * 60 * 1000;
      if (Date.now() > deadlineMs) {
        throw new BadRequestException(
          `Cancellation window closed (${hours}h before session start)`,
        );
      }
    }

    const { detail, cancelledNow } = await this.prisma.$transaction(
      async (tx) => {
        const updated = await tx.reservation.updateMany({
          where: {
            id: reservationId,
            tenantId,
            status: ReservationStatus.CONFIRMED,
          },
          data: { status: ReservationStatus.CANCELLED },
        });
        if (updated.count !== 1) {
          const current = await tx.reservation.findFirst({
            where: { id: reservationId, tenantId },
            include: this.reservationInclude(),
          });
          if (current?.status === ReservationStatus.CANCELLED) {
            return { detail: this.toDetail(current), cancelledNow: false };
          }
          throw new ConflictException(
            'Reservation status changed concurrently; retry',
          );
        }

        const seat = await tx.session.updateMany({
          where: {
            id: before.sessionId,
            tenantId,
            bookedCount: { gt: 0 },
          },
          data: { bookedCount: { decrement: 1 } },
        });
        if (seat.count !== 1) {
          throw new ConflictException(
            'Session bookedCount could not be decremented',
          );
        }

        if (before.creditBalanceId) {
          await tx.contractCreditBalance.update({
            where: { id: before.creditBalanceId },
            data: { remaining: { increment: 1 } },
          });
        }

        const row = await tx.reservation.findFirstOrThrow({
          where: { id: reservationId, tenantId },
          include: this.reservationInclude(),
        });
        return { detail: this.toDetail(row), cancelledNow: true };
      },
    );

    if (cancelledNow) {
      await this.waitlist.tryPromoteForSession(
        tenantId,
        before.sessionId,
        1,
        actor,
      );
      await this.audit.record({
        tenantId,
        actor,
        action: AUDIT_ACTIONS.reservationCancel,
        entityType: 'reservation',
        entityId: reservationId,
        before: this.auditSnapshot(this.toDetail(before)),
        after: this.auditSnapshot(detail),
      });
    }
    return detail;
  }

  private async pickCreditBalance(
    tenantId: string,
    memberId: string,
    serviceId: string,
    contractId?: string,
  ): Promise<{ id: string; contractId: string }> {
    const now = new Date();
    const balances = await this.prisma.contractCreditBalance.findMany({
      where: {
        serviceId,
        remaining: { gt: 0 },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        contract: {
          tenantId,
          memberId,
          status: ContractStatus.ACTIVE,
          ...(contractId ? { id: contractId } : {}),
          OR: [{ endsAt: null }, { endsAt: { gt: now } }],
        },
      },
      select: {
        id: true,
        contractId: true,
        expiresAt: true,
        remaining: true,
      },
    });

    if (contractId && balances.length === 0) {
      const contract = await this.prisma.contract.findFirst({
        where: { id: contractId, tenantId, memberId },
        select: { id: true },
      });
      if (!contract) {
        throw new NotFoundException(
          `Contract ${contractId} not found for member`,
        );
      }
      throw new BadRequestException(
        'Selected contract has no usable credit for this service',
      );
    }

    if (balances.length === 0) {
      throw new BadRequestException(
        'No active credit available for this service',
      );
    }

    balances.sort((a, b) => {
      if (a.expiresAt === null && b.expiresAt === null) {
        return 0;
      }
      if (a.expiresAt === null) {
        return 1;
      }
      if (b.expiresAt === null) {
        return -1;
      }
      return a.expiresAt.getTime() - b.expiresAt.getTime();
    });

    return { id: balances[0].id, contractId: balances[0].contractId };
  }

  private reservationInclude() {
    return {
      member: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      session: {
        select: {
          id: true,
          startsAt: true,
          endsAt: true,
          serviceId: true,
          service: { select: { id: true, name: true } },
        },
      },
      transactionItem: {
        select: {
          id: true,
          amount: true,
          method: true,
          status: true,
        },
      },
    };
  }

  private async assertMemberInTenant(
    tenantId: string,
    memberId: string,
    requireActive = false,
  ): Promise<void> {
    const member = await this.prisma.member.findFirst({
      where: { id: memberId, tenantId },
      select: { id: true, status: true },
    });
    if (!member) {
      throw new NotFoundException(`Member ${memberId} not found in tenant`);
    }
    if (requireActive && member.status !== MemberStatus.ACTIVE) {
      throw new BadRequestException('Member must be ACTIVE to reserve');
    }
  }

  private async findInTenant(
    tenantId: string,
    reservationId: string,
  ): Promise<ReservationWithRelations> {
    const reservation = await this.prisma.reservation.findFirst({
      where: { id: reservationId, tenantId },
      include: this.reservationInclude(),
    });
    if (!reservation) {
      throw new NotFoundException(
        `Reservation ${reservationId} not found in tenant`,
      );
    }
    return reservation;
  }

  private toDetail(row: ReservationWithRelations): ReservationDetail {
    return {
      id: row.id,
      tenantId: row.tenantId,
      memberId: row.memberId,
      memberName: row.member.name,
      memberEmail: row.member.email,
      sessionId: row.sessionId,
      sessionStartsAt: row.session.startsAt,
      sessionEndsAt: row.session.endsAt,
      serviceId: row.session.serviceId,
      serviceName: row.session.service.name,
      contractId: row.contractId,
      creditBalanceId: row.creditBalanceId,
      transactionItemId: row.transactionItemId,
      transactionItemAmount: row.transactionItem?.amount ?? null,
      transactionItemMethod: row.transactionItem?.method ?? null,
      status: row.status,
      coverage: row.coverage,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private auditSnapshot(detail: ReservationDetail): Prisma.InputJsonValue {
    return {
      memberId: detail.memberId,
      sessionId: detail.sessionId,
      contractId: detail.contractId,
      creditBalanceId: detail.creditBalanceId,
      transactionItemId: detail.transactionItemId,
      transactionItemAmount: detail.transactionItemAmount,
      status: detail.status,
      coverage: detail.coverage,
    };
  }
}
