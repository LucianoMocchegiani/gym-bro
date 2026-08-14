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
  ReservationCoverage,
  ReservationStatus,
  SessionStatus,
  WaitlistMode,
  WaitlistStatus,
} from '@prisma/client';
import { AUDIT_ACTIONS, AuditActor } from '../audit/audit.types';
import { AuditService } from '../audit/audit.service';
import { ListResult, normalizeListQuery, toListResult } from '../common/list';
import { PrismaService } from '../prisma/prisma.service';
import { TenantSettingsService } from '../tenant-settings/tenant-settings.service';
import {
  JoinWaitlistDto,
  LeaveWaitlistDto,
  ListWaitlistQueryDto,
} from './dto/waitlist.dto';
import { WaitlistEntryDetail } from './waitlist.types';

type WaitlistWithRelations = {
  id: string;
  tenantId: string;
  sessionId: string;
  memberId: string;
  status: WaitlistStatus;
  createdAt: Date;
  updatedAt: Date;
  session: {
    id: string;
    startsAt: Date;
    endsAt: Date;
    serviceId: string;
    service: { id: string; name: string };
  };
  member: { id: string; name: string | null; email: string };
};

/**
 * Lista de espera de sesiones (CU-RES-004 / CU-RES-005 / RN-RES-004..005).
 *
 * @remarks Liberación automática solo para `AUTO_ASSIGN` con crédito.
 * `MEMBER_CONFIRM` / `STAFF_CONFIRM` quedan diferidos (no-op al liberar cupo).
 */
@Injectable()
export class WaitlistService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly tenantSettings: TenantSettingsService,
  ) {}

  /**
   * Anota al afiliado en cola FIFO si la sesión está llena.
   */
  async join(
    tenantId: string,
    memberId: string,
    dto: JoinWaitlistDto,
    actor: AuditActor,
  ): Promise<WaitlistEntryDetail> {
    await this.assertMemberInTenant(tenantId, memberId, true);

    const session = await this.prisma.session.findFirst({
      where: { id: dto.sessionId, tenantId },
      select: {
        id: true,
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
    if (session.bookedCount < session.capacity) {
      throw new BadRequestException(
        'Session has free capacity; reserve instead of joining waitlist',
      );
    }

    const confirmed = await this.prisma.reservation.findFirst({
      where: {
        tenantId,
        memberId,
        sessionId: session.id,
        status: ReservationStatus.CONFIRMED,
      },
      select: { id: true },
    });
    if (confirmed) {
      throw new ConflictException(
        'Member already has a confirmed reservation for this session',
      );
    }

    try {
      const entry = await this.prisma.waitlistEntry.create({
        data: {
          tenantId,
          sessionId: session.id,
          memberId,
          status: WaitlistStatus.WAITING,
        },
        include: this.entryInclude(),
      });
      const detail = await this.toDetailWithPosition(entry);
      await this.audit.record({
        tenantId,
        actor,
        action: AUDIT_ACTIONS.waitlistJoin,
        entityType: 'waitlist_entry',
        entityId: entry.id,
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
          'Member is already waiting for this session',
        );
      }
      throw error;
    }
  }

  /**
   * Lista entradas de un afiliado (paginado; próximas primero).
   *
   * @remarks Sin `status` → solo `WAITING` (vista afiliado). Con `status` → filtro exacto.
   */
  async listByMember(
    tenantId: string,
    memberId: string,
    query: ListWaitlistQueryDto = {},
  ): Promise<ListResult<WaitlistEntryDetail>> {
    await this.assertMemberInTenant(tenantId, memberId);
    const n = normalizeListQuery(query);
    const where: Prisma.WaitlistEntryWhereInput = {
      tenantId,
      memberId,
      status: query.status ?? WaitlistStatus.WAITING,
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.waitlistEntry.findMany({
        where,
        include: this.entryInclude(),
        orderBy: { session: { startsAt: n.order } },
        skip: n.skip,
        take: n.take,
      }),
      this.prisma.waitlistEntry.count({ where }),
    ]);
    const items = await Promise.all(
      rows.map((row) => this.toDetailWithPosition(row)),
    );
    return toListResult(items, total, n.page, n.pageSize);
  }

  /**
   * Lista cola de una sesión (paginado; FIFO por `createdAt`).
   *
   * @remarks Default `WAITING`. `allStatuses` lista histórico; con solo
   * `WAITING` la posición es el índice FIFO de la página.
   */
  async listBySession(
    tenantId: string,
    sessionId: string,
    query: ListWaitlistQueryDto = {},
  ): Promise<ListResult<WaitlistEntryDetail>> {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, tenantId },
      select: { id: true },
    });
    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found in tenant`);
    }
    const n = normalizeListQuery(query);
    const waitingOnly =
      !query.allStatuses &&
      (query.status === undefined || query.status === WaitlistStatus.WAITING);
    const where: Prisma.WaitlistEntryWhereInput = {
      tenantId,
      sessionId,
      ...(query.allStatuses
        ? {}
        : { status: query.status ?? WaitlistStatus.WAITING }),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.waitlistEntry.findMany({
        where,
        include: this.entryInclude(),
        orderBy: { createdAt: 'asc' },
        skip: n.skip,
        take: n.take,
      }),
      this.prisma.waitlistEntry.count({ where }),
    ]);
    const items = waitingOnly
      ? rows.map((row, index) => this.toDetail(row, n.skip + index + 1))
      : await Promise.all(rows.map((row) => this.toDetailWithPosition(row)));
    return toListResult(items, total, n.page, n.pageSize);
  }

  /**
   * Sale de la cola (WAITING → LEFT). Idempotente si ya LEFT.
   */
  async leave(
    tenantId: string,
    entryId: string,
    dto: LeaveWaitlistDto,
    actor: AuditActor,
    ownerMemberId?: string,
  ): Promise<WaitlistEntryDetail> {
    if (dto.status !== WaitlistStatus.LEFT) {
      throw new BadRequestException('Only LEFT status is supported');
    }
    const before = await this.findInTenant(tenantId, entryId);
    if (ownerMemberId && before.memberId !== ownerMemberId) {
      throw new NotFoundException(
        `Waitlist entry ${entryId} not found in tenant`,
      );
    }
    if (before.status === WaitlistStatus.LEFT) {
      return this.toDetailWithPosition(before);
    }
    if (before.status !== WaitlistStatus.WAITING) {
      throw new BadRequestException(
        `Only WAITING entries can leave (current: ${before.status})`,
      );
    }

    const updated = await this.prisma.waitlistEntry.update({
      where: { id: entryId },
      data: { status: WaitlistStatus.LEFT },
      include: this.entryInclude(),
    });
    const detail = await this.toDetailWithPosition(updated);
    await this.audit.record({
      tenantId,
      actor,
      action: AUDIT_ACTIONS.waitlistLeave,
      entityType: 'waitlist_entry',
      entityId: entryId,
      before: this.auditSnapshot(await this.toDetailWithPosition(before)),
      after: this.auditSnapshot(detail),
    });
    return detail;
  }

  /**
   * Intenta promover hasta `slots` candidatos WAITING (modo AUTO_ASSIGN + crédito).
   *
   * @remarks Si el modo no es AUTO_ASSIGN, no-op. Candidatos sin crédito se
   * omiten en esta pasada y permanecen WAITING (CU-RES-005 modo 1).
   */
  async tryPromoteForSession(
    tenantId: string,
    sessionId: string,
    slots: number,
    actor: AuditActor,
  ): Promise<number> {
    if (slots <= 0) {
      return 0;
    }
    const mode = await this.tenantSettings.getWaitlistMode(tenantId);
    if (mode !== WaitlistMode.AUTO_ASSIGN) {
      return 0;
    }

    let promoted = 0;
    const skipped = new Set<string>();

    while (promoted < slots) {
      const candidate = await this.prisma.waitlistEntry.findFirst({
        where: {
          tenantId,
          sessionId,
          status: WaitlistStatus.WAITING,
          ...(skipped.size > 0 ? { id: { notIn: [...skipped] } } : {}),
        },
        orderBy: { createdAt: 'asc' },
        include: this.entryInclude(),
      });
      if (!candidate) {
        break;
      }

      const result = await this.tryPromoteCandidate(tenantId, candidate, actor);
      if (result === 'promoted') {
        promoted += 1;
      } else {
        skipped.add(candidate.id);
      }
    }
    return promoted;
  }

  private async tryPromoteCandidate(
    tenantId: string,
    entry: WaitlistWithRelations,
    actor: AuditActor,
  ): Promise<'promoted' | 'skipped'> {
    const session = await this.prisma.session.findFirst({
      where: { id: entry.sessionId, tenantId },
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
    if (
      !session ||
      session.status !== SessionStatus.PUBLISHED ||
      session.bookedCount >= session.capacity
    ) {
      return 'skipped';
    }
    const open = await this.tenantSettings.isSessionOpenForBooking(
      tenantId,
      session,
    );
    if (!open) {
      return 'skipped';
    }

    let credit: { id: string; contractId: string };
    try {
      credit = await this.pickCreditBalance(
        tenantId,
        entry.memberId,
        session.serviceId,
      );
    } catch {
      return 'skipped';
    }

    try {
      const reservation = await this.prisma.$transaction(async (tx) => {
        const claimed = await tx.waitlistEntry.updateMany({
          where: {
            id: entry.id,
            tenantId,
            status: WaitlistStatus.WAITING,
          },
          data: { status: WaitlistStatus.PROMOTED },
        });
        if (claimed.count !== 1) {
          return null;
        }

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
        if (
          !fresh ||
          fresh.status !== SessionStatus.PUBLISHED ||
          fresh.bookedCount >= fresh.capacity
        ) {
          throw new BadRequestException('Session no longer has free capacity');
        }
        const stillOpen = await this.tenantSettings.isSessionOpenForBooking(
          tenantId,
          fresh,
        );
        if (!stillOpen) {
          throw new BadRequestException(
            'Session is no longer open for booking',
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
          throw new ConflictException('Session capacity changed concurrently');
        }

        const debit = await tx.contractCreditBalance.updateMany({
          where: { id: credit.id, remaining: { gt: 0 } },
          data: { remaining: { decrement: 1 } },
        });
        if (debit.count !== 1) {
          throw new BadRequestException('No credit remaining');
        }

        return tx.reservation.create({
          data: {
            tenantId,
            memberId: entry.memberId,
            sessionId: session.id,
            contractId: credit.contractId,
            creditBalanceId: credit.id,
            status: ReservationStatus.CONFIRMED,
            coverage: ReservationCoverage.CREDIT,
          },
        });
      });

      if (!reservation) {
        return 'skipped';
      }

      await this.audit.record({
        tenantId,
        actor,
        action: AUDIT_ACTIONS.waitlistPromote,
        entityType: 'waitlist_entry',
        entityId: entry.id,
        before: { status: WaitlistStatus.WAITING },
        after: {
          status: WaitlistStatus.PROMOTED,
          reservationId: reservation.id,
        },
      });
      await this.audit.record({
        tenantId,
        actor,
        action: AUDIT_ACTIONS.reservationCreate,
        entityType: 'reservation',
        entityId: reservation.id,
        before: null,
        after: {
          memberId: entry.memberId,
          sessionId: session.id,
          coverage: ReservationCoverage.CREDIT,
          source: 'waitlist',
        },
      });
      return 'promoted';
    } catch {
      // Revert PROMOTED if transaction failed after claim — transaction rolls back.
      return 'skipped';
    }
  }

  private async pickCreditBalance(
    tenantId: string,
    memberId: string,
    serviceId: string,
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
          OR: [{ endsAt: null }, { endsAt: { gt: now } }],
        },
      },
      select: {
        id: true,
        contractId: true,
        expiresAt: true,
      },
    });
    if (balances.length === 0) {
      throw new BadRequestException('No active credit available');
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

  private entryInclude() {
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
      member: { select: { id: true, name: true, email: true } },
    };
  }

  private async findInTenant(
    tenantId: string,
    entryId: string,
  ): Promise<WaitlistWithRelations> {
    const entry = await this.prisma.waitlistEntry.findFirst({
      where: { id: entryId, tenantId },
      include: this.entryInclude(),
    });
    if (!entry) {
      throw new NotFoundException(
        `Waitlist entry ${entryId} not found in tenant`,
      );
    }
    return entry;
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
      throw new BadRequestException('Member must be ACTIVE to join waitlist');
    }
  }

  private async toDetailWithPosition(
    row: WaitlistWithRelations,
  ): Promise<WaitlistEntryDetail> {
    if (row.status !== WaitlistStatus.WAITING) {
      return this.toDetail(row, null);
    }
    const ahead = await this.prisma.waitlistEntry.count({
      where: {
        tenantId: row.tenantId,
        sessionId: row.sessionId,
        status: WaitlistStatus.WAITING,
        createdAt: { lt: row.createdAt },
      },
    });
    return this.toDetail(row, ahead + 1);
  }

  private toDetail(
    row: WaitlistWithRelations,
    position: number | null,
  ): WaitlistEntryDetail {
    return {
      id: row.id,
      tenantId: row.tenantId,
      sessionId: row.sessionId,
      sessionStartsAt: row.session.startsAt,
      sessionEndsAt: row.session.endsAt,
      serviceId: row.session.serviceId,
      serviceName: row.session.service.name,
      memberId: row.memberId,
      memberName: row.member.name,
      memberEmail: row.member.email,
      status: row.status,
      position,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private auditSnapshot(detail: WaitlistEntryDetail): Prisma.InputJsonValue {
    return {
      sessionId: detail.sessionId,
      memberId: detail.memberId,
      status: detail.status,
      position: detail.position,
    };
  }
}
