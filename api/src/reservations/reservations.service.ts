import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ContractStatus,
  MemberStatus,
  Prisma,
  Reservation,
  ReservationCoverage,
  ReservationStatus,
  SessionStatus,
} from '@prisma/client';
import { AUDIT_ACTIONS, AuditActor } from '../audit/audit.types';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReservationDto } from './dto/reservation.dto';
import { ReservationDetail } from './reservations.types';

type ReservationWithRelations = Reservation & {
  session: {
    id: string;
    startsAt: Date;
    endsAt: Date;
    serviceId: string;
    service: { id: string; name: string };
  };
};

/**
 * Reservas con crédito (CU-RES-001 / CU-RES-002 / RN-RES-001).
 *
 * @remarks Drop-in, lista de espera y cancelación con ventana quedan fuera.
 */
@Injectable()
export class ReservationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
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
   * Confirma reserva consumiendo 1 crédito del servicio de la sesión.
   *
   * @remarks Elige saldo con `expiresAt` más próximo (nulls al final).
   * Incrementa `bookedCount` de forma condicional para evitar overbooking.
   */
  async createForMember(
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
    if (session.startsAt.getTime() <= Date.now()) {
      throw new BadRequestException('Session has already started');
    }
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
          },
        });
        if (!fresh || fresh.status !== SessionStatus.PUBLISHED) {
          throw new BadRequestException('Session is not published');
        }
        if (fresh.startsAt.getTime() <= Date.now()) {
          throw new BadRequestException('Session has already started');
        }
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
      status: detail.status,
      coverage: detail.coverage,
    };
  }
}
