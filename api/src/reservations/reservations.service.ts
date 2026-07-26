import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ContractStatus,
  CashMovementConcept,
  MemberStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  Reservation,
  ReservationCoverage,
  ReservationStatus,
  SessionStatus,
} from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { AUDIT_ACTIONS, AuditActor } from '../audit/audit.types';
import { AuditService } from '../audit/audit.service';
import { CashRegisterService } from '../cash-register/cash-register.service';
import { PrismaService } from '../prisma/prisma.service';
import { TenantSettingsService } from '../tenant-settings/tenant-settings.service';
import { WaitlistService } from '../waitlist/waitlist.service';
import {
  CreateReservationDto,
  UpdateReservationStatusDto,
} from './dto/reservation.dto';
import { ReservationDetail } from './reservations.types';

type ReservationWithRelations = Reservation & {
  session: {
    id: string;
    startsAt: Date;
    endsAt: Date;
    serviceId: string;
    service: { id: string; name: string };
  };
  payment: {
    id: string;
    amount: number;
    method: PaymentMethod;
    status: PaymentStatus;
  } | null;
};

/**
 * Reservas con crédito o drop-in (CU-RES-001 / CU-RES-002 / RN-RES-001)
 * y cancelación (CU-RES-003).
 *
 * @remarks Drop-in: staff-only, Payment APPROVED stub/caja. CASH → movimiento
 * de caja. Cancelación: CREDIT devuelve crédito; DROP_IN no reembolsa (E5).
 * Ingreso tardío RN-RES-006.
 */
@Injectable()
export class ReservationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly tenantSettings: TenantSettingsService,
    private readonly waitlist: WaitlistService,
    private readonly cashRegister: CashRegisterService,
  ) {}

  /**
   * Lista reservas de un afiliado (más próximas primero).
   */
  async listByMember(
    tenantId: string,
    memberId: string,
    options: { status?: ReservationStatus } = {},
  ): Promise<ReservationDetail[]> {
    await this.assertMemberInTenant(tenantId, memberId);
    const rows = await this.prisma.reservation.findMany({
      where: {
        tenantId,
        memberId,
        ...(options.status ? { status: options.status } : {}),
      },
      include: this.reservationInclude(),
      orderBy: { session: { startsAt: 'asc' } },
    });
    return rows.map((r) => this.toDetail(r));
  }

  /**
   * Detalle de reserva en el tenant.
   */
  async findOne(
    tenantId: string,
    reservationId: string,
  ): Promise<ReservationDetail> {
    const reservation = await this.findInTenant(tenantId, reservationId);
    return this.toDetail(reservation);
  }

  /**
   * Confirma reserva con crédito o drop-in según `coverage`.
   *
   * @remarks Default CREDIT. DROP_IN solo staff/super (CU-RES-002).
   */
  async createForMember(
    tenantId: string,
    memberId: string,
    dto: CreateReservationDto,
    actor: AuditActor,
  ): Promise<ReservationDetail> {
    const coverage = dto.coverage ?? ReservationCoverage.CREDIT;
    if (coverage === ReservationCoverage.DROP_IN) {
      if (actor.profileType === 'MEMBER') {
        throw new ForbiddenException(
          'Drop-in reservations require staff (pay at desk / stub)',
        );
      }
      return this.createDropIn(tenantId, memberId, dto, actor);
    }
    return this.createWithCredit(tenantId, memberId, dto, actor);
  }

  /**
   * Confirma reserva consumiendo 1 crédito del servicio de la sesión.
   *
   * @remarks Elige saldo con `expiresAt` más próximo (nulls al final).
   * Incrementa `bookedCount` de forma condicional para evitar overbooking.
   * Si la sesión ya inició, solo permite si el gym tiene ingreso tardío ON y
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
   * Reserva drop-in con pago stub/caja ya aprobado (CU-RES-002 / RN-PAG-004).
   *
   * @remarks Precio desde `service.dropInPrice`. Idempotente por `idempotencyKey`.
   */
  private async createDropIn(
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
        service: {
          select: {
            id: true,
            name: true,
            active: true,
            dropInPrice: true,
            type: true,
          },
        },
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
    if (!session.service.active) {
      throw new BadRequestException('Service is inactive');
    }
    if (
      session.service.dropInPrice === null ||
      session.service.dropInPrice < 1
    ) {
      throw new BadRequestException(
        'Drop-in is not enabled for this service (set dropInPrice)',
      );
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

    const idempotencyKey =
      dto.idempotencyKey?.trim() || `stub-${randomBytes(16).toString('hex')}`;
    const method = dto.method ?? PaymentMethod.STUB;

    const existingPayment = await this.prisma.payment.findUnique({
      where: {
        tenantId_idempotencyKey: { tenantId, idempotencyKey },
      },
      include: {
        reservation: { include: this.reservationInclude() },
      },
    });
    if (existingPayment?.reservation) {
      return this.toDetail(existingPayment.reservation);
    }
    if (existingPayment && !existingPayment.reservation) {
      throw new BadRequestException(
        'Idempotency key already used without a reservation',
      );
    }

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

        const payment = await tx.payment.create({
          data: {
            tenantId,
            memberId,
            packId: null,
            amount: session.service.dropInPrice!,
            status: PaymentStatus.APPROVED,
            method,
            idempotencyKey,
          },
        });

        await this.cashRegister.recordIncomeIfCash(tx, {
          tenantId,
          paymentId: payment.id,
          memberId,
          amount: payment.amount,
          method: payment.method,
          concept: CashMovementConcept.DROP_IN,
          recordedByStaffId:
            actor.profileType === 'STAFF' ? actor.userId : null,
        });

        return tx.reservation.create({
          data: {
            tenantId,
            memberId,
            sessionId: session.id,
            paymentId: payment.id,
            status: ReservationStatus.CONFIRMED,
            coverage: ReservationCoverage.DROP_IN,
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
        const again = await this.prisma.payment.findUnique({
          where: {
            tenantId_idempotencyKey: { tenantId, idempotencyKey },
          },
          include: {
            reservation: { include: this.reservationInclude() },
          },
        });
        if (again?.reservation) {
          return this.toDetail(again.reservation);
        }
        throw new ConflictException(
          'Member already has a confirmed reservation for this session',
        );
      }
      throw error;
    }
  }

  /**
   * Cancela una reserva confirmada (CU-RES-003 / RN-RES-003 / RN-TEN-005).
   *
   * @remarks Libera cupo. Si coverage CREDIT, devuelve 1 crédito. DROP_IN no
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
      session: {
        select: {
          id: true,
          startsAt: true,
          endsAt: true,
          serviceId: true,
          service: { select: { id: true, name: true } },
        },
      },
      payment: {
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
      sessionId: row.sessionId,
      sessionStartsAt: row.session.startsAt,
      sessionEndsAt: row.session.endsAt,
      serviceId: row.session.serviceId,
      serviceName: row.session.service.name,
      contractId: row.contractId,
      creditBalanceId: row.creditBalanceId,
      paymentId: row.paymentId,
      paymentAmount: row.payment?.amount ?? null,
      paymentMethod: row.payment?.method ?? null,
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
      paymentId: detail.paymentId,
      paymentAmount: detail.paymentAmount,
      status: detail.status,
      coverage: detail.coverage,
    };
  }
}
