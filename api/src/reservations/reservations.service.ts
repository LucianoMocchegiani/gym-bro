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
  ReceiptConcept,
  Reservation,
  ReservationCoverage,
  ReservationStatus,
  SessionStatus,
} from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { AUDIT_ACTIONS, AuditActor } from '../audit/audit.types';
import { AuditService } from '../audit/audit.service';
import {
  ListResult,
  normalizeListQuery,
  resolveOrderField,
  toListResult,
} from '../common/list';
import { PrismaService } from '../prisma/prisma.service';
import { CashPaymentService } from '../payment/cash-payment.service';
import { SessionValidationService } from '../sessions/session-validation.service';
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
 * Reservas con crédito o drop-in (CU-RES-001 / CU-RES-002 / RN-RES-001)
 * y cancelación (CU-RES-003).
 *
 * @remarks Drop-in: staff-only, Payment APPROVED stub/caja. CASH → movimiento
 * de caja. Comprobante interno RN-PAG-009. Cancelación: CREDIT devuelve crédito;
 * DROP_IN no reembolsa (E5). Ingreso tardío RN-RES-006.
 */
@Injectable()
export class ReservationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly tenantSettings: TenantSettingsService,
    private readonly waitlist: WaitlistService,
    private readonly cashPayment: CashPaymentService,
    private readonly sessionValidation: SessionValidationService,
  ) {}

  /**
   * Lista reservas de un afiliado (paginado; próximas primero por defecto).
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
   * Roster de una sesión (paginado; confirmadas primero por defecto vía filtro).
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
   * Valida que un miembro pueda hacer drop-in en una sesión.
   *
   * @throws NotFoundException Sesión no existe
   * @throws BadRequestException Sesión no publicada / sin lugar / servicio inactivo / precio drop-in no configurado / fuera de ventana de booking
   * @throws ConflictException Ya tiene reserva confirmada para esa sesión
   */
  async validateSessionForDropIn(
    tenantId: string,
    memberId: string,
    sessionId: string,
  ) {
    return this.sessionValidation.validateSessionForDropIn(tenantId, memberId, sessionId);
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

    const session = await this.validateSessionForDropIn(
      tenantId,
      memberId,
      dto.sessionId,
    );

    const idempotencyKey =
      dto.idempotencyKey?.trim() || `stub-${randomBytes(16).toString('hex')}`;
    const method = dto.method ?? PaymentMethod.STUB;
    if (method === PaymentMethod.MP) {
      throw new BadRequestException(
        'Use POST /me/payments/mp/drop-in-checkout (or Staff /members/:id/...) for Mercado Pago drop-in',
      );
    }
    if (method === PaymentMethod.CASH) {
      throw new BadRequestException(
        'Use POST /members/:id/transaction-items/cash/cart for CASH drop-ins',
      );
    }

    const existingTransactionItem = await this.prisma.transactionItem.findUnique({
      where: {
        tenantId_idempotencyKey: { tenantId, idempotencyKey },
      },
      include: {
        reservation: { include: this.reservationInclude() },
      },
    });
    if (existingTransactionItem?.reservation) {
      return this.toDetail(existingTransactionItem.reservation);
    }
    if (existingTransactionItem && !existingTransactionItem.reservation) {
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

        const { transaction } = await this.cashPayment.processPayment(tx, {
          tenantId,
          memberId,
          items: [{
            sessionId: session.id,
            amount: session.service.dropInPrice!,
            idempotencyKey,
          }],
          idempotencyKey,
          method,
          cashConcept: CashMovementConcept.DROP_IN,
          receiptConcept: ReceiptConcept.DROP_IN,
          description: session.service.name,
          recordedByStaffId: actor.profileType === 'STAFF' ? actor.userId : null,
        });

        return tx.reservation.create({
          data: {
            tenantId,
            memberId,
            sessionId: session.id,
            transactionItemId: transaction.transactionItems[0].id,
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
        const again = await this.prisma.transactionItem.findUnique({
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
   * Confirma reserva DROP_IN + comprobante para un pago MP ya APPROVED.
   *
   * @remarks Idempotente si la reserva ya existe. Usado por webhook (CU-RES-001).
   * Si el cupo se agotó tras el pago, lanza error (admin/reembolso edge case).
   */
  async confirmDropInFromApprovedPayment(
    tenantId: string,
    transactionItemId: string,
    actor: AuditActor,
  ): Promise<ReservationDetail> {
    const transactionItem = await this.prisma.transactionItem.findFirst({
      where: { id: transactionItemId, tenantId },
      include: {
        reservation: { include: this.reservationInclude() },
      },
    });
    if (!transactionItem) {
      throw new NotFoundException(`TransactionItem ${transactionItemId} not found in tenant`);
    }
    if (transactionItem.reservation) {
      return this.toDetail(transactionItem.reservation);
    }
    if (transactionItem.status !== PaymentStatus.APPROVED) {
      throw new BadRequestException(
        `TransactionItem must be APPROVED to confirm drop-in (current: ${transactionItem.status})`,
      );
    }
    if (transactionItem.method !== PaymentMethod.MP) {
      throw new BadRequestException(
        'confirmDropInFromApprovedPayment is only for MP payments',
      );
    }
    if (!transactionItem.sessionId) {
      throw new BadRequestException('MP drop-in payment is missing sessionId');
    }
    if (transactionItem.packId) {
      throw new BadRequestException(
        'TransactionItem looks like a pack checkout, not drop-in',
      );
    }

    const session = await this.prisma.session.findFirst({
      where: { id: transactionItem.sessionId, tenantId },
      select: {
        id: true,
        status: true,
        startsAt: true,
        endsAt: true,
        capacity: true,
        bookedCount: true,
        service: { select: { name: true } },
      },
    });
    if (!session) {
      throw new NotFoundException(
        `Session ${transactionItem.sessionId} not found in tenant`,
      );
    }
    if (session.status !== SessionStatus.PUBLISHED) {
      throw new BadRequestException('Session is not published');
    }

    const existingRes = await this.prisma.reservation.findFirst({
      where: {
        tenantId,
        memberId: transactionItem.memberId,
        sessionId: session.id,
        status: ReservationStatus.CONFIRMED,
      },
      select: { id: true },
    });
    if (existingRes) {
      throw new ConflictException(
        'Member already has a confirmed reservation for this session',
      );
    }

    try {
      await this.tenantSettings.assertSessionOpenForBooking(tenantId, session);

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
          throw new BadRequestException(
            'Session is full; refund the MP drop-in payment',
          );
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

        return tx.reservation.create({
          data: {
            tenantId,
            memberId: transactionItem.memberId,
            sessionId: session.id,
            transactionItemId: transactionItem.id,
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
        const again = await this.prisma.transactionItem.findUnique({
          where: { id: transactionItemId },
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
