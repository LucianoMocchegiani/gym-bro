import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ServiceType, Session, SessionStatus } from '@prisma/client';
import { AUDIT_ACTIONS, AuditActor } from '../audit/audit.types';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { WaitlistService } from '../waitlist/waitlist.service';
import {
  CreateSessionDto,
  ExpandSessionCapacityDto,
  UpdateSessionDto,
} from './dto/session.dto';
import { SessionDetail } from './sessions.types';

type SessionWithRelations = Session & {
  service: { id: string; name: string };
  branch: { id: string; name: string };
  instructor: { id: string; name: string | null } | null;
};

/**
 * Sesiones puntuales de calendario (CU-SER-003 / RN-SER-010..013).
 *
 * @remarks Ampliar cupo: CU-SER-005. Liberación lista de espera: CU-RES-005 (AUTO_ASSIGN).
 */
@Injectable()
export class SessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly waitlist: WaitlistService,
  ) {}

  /**
   * Lista sesiones del tenant (próximas primero por startsAt).
   */
  async list(
    tenantId: string,
    options: {
      serviceId?: string;
      status?: SessionStatus;
      from?: string;
      to?: string;
    } = {},
  ): Promise<SessionDetail[]> {
    await this.assertTenantExists(tenantId);
    const from = options.from
      ? this.parseDate(options.from, 'from')
      : undefined;
    const to = options.to ? this.parseDate(options.to, 'to') : undefined;
    if (from && to && to <= from) {
      throw new BadRequestException('to must be after from');
    }

    const sessions = await this.prisma.session.findMany({
      where: {
        tenantId,
        ...(options.serviceId ? { serviceId: options.serviceId } : {}),
        ...(options.status ? { status: options.status } : {}),
        ...(from || to
          ? {
              startsAt: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
      },
      include: this.sessionInclude(),
      orderBy: { startsAt: 'asc' },
    });
    return sessions.map((s) => this.toDetail(s));
  }

  /**
   * Detalle de una sesión del tenant.
   */
  async findOne(tenantId: string, sessionId: string): Promise<SessionDetail> {
    const session = await this.findInTenant(tenantId, sessionId);
    return this.toDetail(session);
  }

  /**
   * Crea sesión PUBLISHED para un servicio POR_SESIONES activo.
   */
  async create(
    tenantId: string,
    dto: CreateSessionDto,
    actor: AuditActor,
  ): Promise<SessionDetail> {
    await this.assertTenantExists(tenantId);
    const service = await this.assertSessionService(tenantId, dto.serviceId);
    const startsAt = this.parseDate(dto.startsAt, 'startsAt');
    const endsAt = this.parseDate(dto.endsAt, 'endsAt');
    this.assertTimeRange(startsAt, endsAt);

    const branchId = await this.resolveBranchId(tenantId, dto.branchId);
    const instructorId = dto.instructorId
      ? await this.assertInstructor(tenantId, dto.instructorId)
      : null;

    const session = await this.prisma.session.create({
      data: {
        tenantId,
        serviceId: service.id,
        branchId,
        instructorId,
        startsAt,
        endsAt,
        capacity: dto.capacity,
        bookedCount: 0,
        status: SessionStatus.PUBLISHED,
      },
      include: this.sessionInclude(),
    });

    const detail = this.toDetail(session);
    await this.audit.record({
      tenantId,
      actor,
      action: AUDIT_ACTIONS.sessionCreate,
      entityType: 'session',
      entityId: session.id,
      before: null,
      after: this.auditSnapshot(detail),
    });
    return detail;
  }

  /**
   * Edita horario/cupo/profe/sede o cancela (status CANCELLED).
   */
  async update(
    tenantId: string,
    sessionId: string,
    dto: UpdateSessionDto,
    actor: AuditActor,
  ): Promise<SessionDetail> {
    if (
      dto.startsAt === undefined &&
      dto.endsAt === undefined &&
      dto.capacity === undefined &&
      dto.instructorId === undefined &&
      dto.branchId === undefined &&
      dto.status === undefined
    ) {
      throw new BadRequestException(
        'Provide startsAt, endsAt, capacity, instructorId, branchId and/or status',
      );
    }

    const before = await this.findInTenant(tenantId, sessionId);
    if (
      before.status === SessionStatus.CANCELLED &&
      dto.status !== SessionStatus.CANCELLED
    ) {
      throw new BadRequestException('Cancelled sessions cannot be edited');
    }

    const data: Prisma.SessionUpdateInput = {};

    const nextStarts = dto.startsAt
      ? this.parseDate(dto.startsAt, 'startsAt')
      : before.startsAt;
    const nextEnds = dto.endsAt
      ? this.parseDate(dto.endsAt, 'endsAt')
      : before.endsAt;
    if (dto.startsAt !== undefined || dto.endsAt !== undefined) {
      this.assertTimeRange(nextStarts, nextEnds);
      if (dto.startsAt !== undefined) {
        data.startsAt = nextStarts;
      }
      if (dto.endsAt !== undefined) {
        data.endsAt = nextEnds;
      }
    }

    if (dto.capacity !== undefined) {
      if (dto.capacity < before.bookedCount) {
        throw new BadRequestException(
          `capacity cannot be below bookedCount (${before.bookedCount})`,
        );
      }
      data.capacity = dto.capacity;
    }

    if (dto.instructorId !== undefined) {
      if (dto.instructorId === null) {
        data.instructor = { disconnect: true };
      } else {
        await this.assertInstructor(tenantId, dto.instructorId);
        data.instructor = { connect: { id: dto.instructorId } };
      }
    }

    if (dto.branchId !== undefined) {
      await this.assertBranchInTenant(tenantId, dto.branchId);
      data.branch = { connect: { id: dto.branchId } };
    }

    if (dto.status === SessionStatus.CANCELLED) {
      data.status = SessionStatus.CANCELLED;
    }

    if (
      before.status === SessionStatus.CANCELLED &&
      dto.status === SessionStatus.CANCELLED
    ) {
      return this.toDetail(before);
    }

    const session = await this.prisma.session.update({
      where: { id: sessionId },
      data,
      include: this.sessionInclude(),
    });
    const detail = this.toDetail(session);
    await this.audit.record({
      tenantId,
      actor,
      action:
        dto.status === SessionStatus.CANCELLED
          ? AUDIT_ACTIONS.sessionCancel
          : AUDIT_ACTIONS.sessionUpdate,
      entityType: 'session',
      entityId: sessionId,
      before: this.auditSnapshot(this.toDetail(before)),
      after: this.auditSnapshot(detail),
    });
    return detail;
  }

  /**
   * Amplía el cupo de una sesión publicada (CU-SER-005 / RN-SER-010).
   *
   * @remarks Solo acepta `capacity` estrictamente mayor al actual.
   * Tras el update invoca el hook de lista de espera (no-op hasta CU-RES-005).
   * @throws {BadRequestException} Si la sesión está cancelada o el cupo no sube.
   */
  async expandCapacity(
    tenantId: string,
    sessionId: string,
    dto: ExpandSessionCapacityDto,
    actor: AuditActor,
  ): Promise<SessionDetail> {
    const before = await this.findInTenant(tenantId, sessionId);
    if (before.status === SessionStatus.CANCELLED) {
      throw new BadRequestException(
        'Cannot expand capacity of a cancelled session',
      );
    }
    if (dto.capacity <= before.capacity) {
      throw new BadRequestException(
        `capacity must be greater than current (${before.capacity})`,
      );
    }

    const slotsOpened = dto.capacity - before.capacity;
    const session = await this.prisma.session.update({
      where: { id: sessionId },
      data: { capacity: dto.capacity },
      include: this.sessionInclude(),
    });
    const detail = this.toDetail(session);

    await this.waitlist.tryPromoteForSession(
      tenantId,
      sessionId,
      slotsOpened,
      actor,
    );

    await this.audit.record({
      tenantId,
      actor,
      action: AUDIT_ACTIONS.sessionCapacityExpand,
      entityType: 'session',
      entityId: sessionId,
      before: this.auditSnapshot(this.toDetail(before)),
      after: this.auditSnapshot(detail),
    });
    return detail;
  }

  private sessionInclude() {
    return {
      service: { select: { id: true, name: true } },
      branch: { select: { id: true, name: true } },
      instructor: { select: { id: true, name: true } },
    };
  }

  private async assertTenantExists(tenantId: string): Promise<void> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true },
    });
    if (!tenant) {
      throw new NotFoundException(`Tenant ${tenantId} not found`);
    }
  }

  private async assertSessionService(
    tenantId: string,
    serviceId: string,
  ): Promise<{ id: string }> {
    const service = await this.prisma.service.findFirst({
      where: { id: serviceId, tenantId },
      select: { id: true, type: true, active: true },
    });
    if (!service) {
      throw new NotFoundException(`Service ${serviceId} not found in tenant`);
    }
    if (service.type !== ServiceType.POR_SESIONES) {
      throw new BadRequestException('Sessions require a POR_SESIONES service');
    }
    if (!service.active) {
      throw new BadRequestException('Service is inactive');
    }
    return service;
  }

  private async resolveBranchId(
    tenantId: string,
    branchId?: string,
  ): Promise<string> {
    if (branchId) {
      await this.assertBranchInTenant(tenantId, branchId);
      return branchId;
    }
    const defaultBranch = await this.prisma.branch.findFirst({
      where: { tenantId, isDefault: true },
      select: { id: true },
    });
    if (!defaultBranch) {
      throw new BadRequestException('Tenant has no default branch');
    }
    return defaultBranch.id;
  }

  private async assertBranchInTenant(
    tenantId: string,
    branchId: string,
  ): Promise<void> {
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, tenantId },
      select: { id: true },
    });
    if (!branch) {
      throw new BadRequestException(
        `Branch ${branchId} does not belong to this tenant`,
      );
    }
  }

  private async assertInstructor(
    tenantId: string,
    instructorId: string,
  ): Promise<string> {
    const staff = await this.prisma.staffUser.findFirst({
      where: { id: instructorId, tenantId },
      select: { id: true, active: true },
    });
    if (!staff) {
      throw new BadRequestException(
        `Instructor ${instructorId} is not a staff user of this tenant`,
      );
    }
    if (!staff.active) {
      throw new BadRequestException('Instructor staff user is inactive');
    }
    return staff.id;
  }

  private async findInTenant(
    tenantId: string,
    sessionId: string,
  ): Promise<SessionWithRelations> {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, tenantId },
      include: this.sessionInclude(),
    });
    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found in tenant`);
    }
    return session;
  }

  private parseDate(value: string, field: string): Date {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${field} is invalid`);
    }
    return date;
  }

  private assertTimeRange(startsAt: Date, endsAt: Date): void {
    if (endsAt <= startsAt) {
      throw new BadRequestException('endsAt must be after startsAt');
    }
  }

  private toDetail(session: SessionWithRelations): SessionDetail {
    return {
      id: session.id,
      tenantId: session.tenantId,
      serviceId: session.serviceId,
      serviceName: session.service.name,
      branchId: session.branchId,
      branchName: session.branch.name,
      instructorId: session.instructorId,
      instructorName: session.instructor?.name ?? null,
      recurrenceRuleId: session.recurrenceRuleId,
      startsAt: session.startsAt,
      endsAt: session.endsAt,
      capacity: session.capacity,
      bookedCount: session.bookedCount,
      status: session.status,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    };
  }

  private auditSnapshot(detail: SessionDetail): Prisma.InputJsonValue {
    return {
      serviceId: detail.serviceId,
      branchId: detail.branchId,
      instructorId: detail.instructorId,
      startsAt: detail.startsAt.toISOString(),
      endsAt: detail.endsAt.toISOString(),
      capacity: detail.capacity,
      bookedCount: detail.bookedCount,
      status: detail.status,
    };
  }
}
