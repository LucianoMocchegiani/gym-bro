import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  ServiceType,
  SessionRecurrenceRule,
  SessionStatus,
  Weekday,
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
import {
  CreateRecurrenceRuleDto,
  DeactivateRecurrenceRuleDto,
  ListRecurrenceRulesQueryDto,
} from './dto/recurrence-rule.dto';
import { RecurrenceRuleDetail } from './recurrence-rules.types';

const MAX_RANGE_MONTHS = 6;

/** Whitelist de orden para {@link RecurrenceRulesService.list}. */
const RECURRENCE_RULE_ORDER_FIELDS = ['createdAt'] as const;

const WEEKDAY_BY_UTC_DAY: Record<number, Weekday> = {
  0: Weekday.SUNDAY,
  1: Weekday.MONDAY,
  2: Weekday.TUESDAY,
  3: Weekday.WEDNESDAY,
  4: Weekday.THURSDAY,
  5: Weekday.FRIDAY,
  6: Weekday.SATURDAY,
};

type RuleWithRelations = SessionRecurrenceRule & {
  service: { id: string; name: string };
  branch: { id: string; name: string };
  instructor: { id: string; name: string | null } | null;
  _count: { sessions: number };
};

/**
 * Reglas semanales que materializan sesiones futuras.
 *
 * @remarks CU-SER-004 / RN-SER-012. La serie se genera una vez para un rango
 * finito de hasta seis meses. Las excepciones se editan sobre cada sesión.
 */
@Injectable()
export class RecurrenceRulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Lista reglas del tenant (paginado), con cantidad de sesiones
   * materializadas.
   */
  async list(
    tenantId: string,
    query: ListRecurrenceRulesQueryDto = {},
  ): Promise<ListResult<RecurrenceRuleDetail>> {
    await this.assertTenantExists(tenantId);
    const n = normalizeListQuery(query);
    const orderField = resolveOrderField(
      n.orderBy,
      RECURRENCE_RULE_ORDER_FIELDS,
      'createdAt',
    );
    const where: Prisma.SessionRecurrenceRuleWhereInput = { tenantId };
    const [rules, total] = await this.prisma.$transaction([
      this.prisma.sessionRecurrenceRule.findMany({
        where,
        include: this.ruleInclude(),
        orderBy: { [orderField]: n.order },
        skip: n.skip,
        take: n.take,
      }),
      this.prisma.sessionRecurrenceRule.count({ where }),
    ]);
    return toListResult(
      rules.map((rule) => this.toDetail(rule)),
      total,
      n.page,
      n.pageSize,
    );
  }

  /**
   * Crea una regla y materializa todas sus sesiones PUBLISHED.
   *
   * @throws {BadRequestException} Si el rango, timezone, servicio o plantilla
   * son inválidos, o si el patrón no produce ninguna sesión futura.
   */
  async create(
    tenantId: string,
    dto: CreateRecurrenceRuleDto,
    actor: AuditActor,
  ): Promise<RecurrenceRuleDetail> {
    await this.assertTenantExists(tenantId);
    await this.assertSessionService(tenantId, dto.serviceId);
    this.assertTimezone(dto.timezone);

    const startsOn = this.parseDateOnly(dto.startsOn, 'startsOn');
    const endsOn = this.parseDateOnly(dto.endsOn, 'endsOn');
    this.assertRange(startsOn, endsOn);

    const branchId = await this.resolveBranchId(tenantId, dto.branchId);
    const instructorId = dto.instructorId
      ? await this.assertInstructor(tenantId, dto.instructorId)
      : null;
    const occurrences = this.generateOccurrences(
      startsOn,
      endsOn,
      dto.weekdays,
      dto.localStartTime,
      dto.durationMinutes,
      dto.timezone,
    );
    if (occurrences.length === 0) {
      throw new BadRequestException(
        'Recurrence pattern produces no future sessions in the selected range',
      );
    }

    const rule = await this.prisma.$transaction(async (tx) => {
      const created = await tx.sessionRecurrenceRule.create({
        data: {
          tenantId,
          serviceId: dto.serviceId,
          branchId,
          instructorId,
          weekdays: dto.weekdays,
          localStartTime: dto.localStartTime,
          durationMinutes: dto.durationMinutes,
          timezone: dto.timezone,
          startsOn,
          endsOn,
          capacity: dto.capacity,
          active: true,
        },
      });

      await tx.session.createMany({
        data: occurrences.map(({ startsAt, endsAt }) => ({
          tenantId,
          serviceId: dto.serviceId,
          branchId,
          instructorId,
          recurrenceRuleId: created.id,
          startsAt,
          endsAt,
          capacity: dto.capacity,
          bookedCount: 0,
          status: SessionStatus.PUBLISHED,
        })),
        skipDuplicates: true,
      });

      const withRelations = await tx.sessionRecurrenceRule.findUnique({
        where: { id: created.id },
        include: this.ruleInclude(),
      });
      if (!withRelations) {
        throw new NotFoundException(
          `Recurrence rule ${created.id} was not found after creation`,
        );
      }
      return withRelations;
    });

    const detail = this.toDetail(rule);
    await this.audit.record({
      tenantId,
      actor,
      action: AUDIT_ACTIONS.recurrenceRuleCreate,
      entityType: 'session_recurrence_rule',
      entityId: rule.id,
      before: null,
      after: this.auditSnapshot(detail),
    });
    return detail;
  }

  /**
   * Desactiva la regla; no cancela ni elimina sesiones ya generadas.
   */
  async deactivate(
    tenantId: string,
    ruleId: string,
    dto: DeactivateRecurrenceRuleDto,
    actor: AuditActor,
  ): Promise<RecurrenceRuleDetail> {
    const before = await this.findInTenant(tenantId, ruleId);
    if (dto.active !== false) {
      throw new BadRequestException('Only active=false is supported');
    }
    if (!before.active) {
      return this.toDetail(before);
    }

    const rule = await this.prisma.sessionRecurrenceRule.update({
      where: { id: ruleId },
      data: { active: false },
      include: this.ruleInclude(),
    });
    const detail = this.toDetail(rule);
    await this.audit.record({
      tenantId,
      actor,
      action: AUDIT_ACTIONS.recurrenceRuleDeactivate,
      entityType: 'session_recurrence_rule',
      entityId: rule.id,
      before: this.auditSnapshot(this.toDetail(before)),
      after: this.auditSnapshot(detail),
    });
    return detail;
  }

  private generateOccurrences(
    startsOn: Date,
    endsOn: Date,
    weekdays: Weekday[],
    localStartTime: string,
    durationMinutes: number,
    timezone: string,
  ): { startsAt: Date; endsAt: Date }[] {
    const selected = new Set(weekdays);
    const occurrences: { startsAt: Date; endsAt: Date }[] = [];

    for (
      let date = new Date(startsOn);
      date <= endsOn;
      date.setUTCDate(date.getUTCDate() + 1)
    ) {
      if (!selected.has(WEEKDAY_BY_UTC_DAY[date.getUTCDay()])) {
        continue;
      }
      const startsAt = this.localDateTimeToUtc(date, localStartTime, timezone);
      if (startsAt.getTime() <= Date.now()) {
        continue;
      }
      occurrences.push({
        startsAt,
        endsAt: new Date(startsAt.getTime() + durationMinutes * 60_000),
      });
    }
    return occurrences;
  }

  /**
   * Convierte fecha/hora de pared a UTC usando solo Intl.
   *
   * @remarks La verificación final rechaza horas inexistentes por cambios DST.
   */
  private localDateTimeToUtc(
    date: Date,
    localStartTime: string,
    timezone: string,
  ): Date {
    const [hour, minute] = localStartTime.split(':').map(Number);
    const desired = {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
      hour,
      minute,
    };
    const desiredAsUtc = Date.UTC(
      desired.year,
      desired.month - 1,
      desired.day,
      desired.hour,
      desired.minute,
    );
    let candidate = desiredAsUtc;

    for (let i = 0; i < 3; i += 1) {
      const actual = this.zonedParts(new Date(candidate), timezone);
      const actualAsUtc = Date.UTC(
        actual.year,
        actual.month - 1,
        actual.day,
        actual.hour,
        actual.minute,
      );
      const difference = actualAsUtc - desiredAsUtc;
      if (difference === 0) {
        break;
      }
      candidate -= difference;
    }

    const result = new Date(candidate);
    const verified = this.zonedParts(result, timezone);
    if (
      verified.year !== desired.year ||
      verified.month !== desired.month ||
      verified.day !== desired.day ||
      verified.hour !== desired.hour ||
      verified.minute !== desired.minute
    ) {
      throw new BadRequestException(
        `Local time ${localStartTime} does not exist in timezone ${timezone}`,
      );
    }
    return result;
  }

  private zonedParts(
    date: Date,
    timezone: string,
  ): {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
  } {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
    const values = new Map(
      formatter
        .formatToParts(date)
        .filter((part) => part.type !== 'literal')
        .map((part) => [part.type, Number(part.value)]),
    );
    return {
      year: values.get('year') ?? 0,
      month: values.get('month') ?? 0,
      day: values.get('day') ?? 0,
      hour: values.get('hour') ?? 0,
      minute: values.get('minute') ?? 0,
    };
  }

  private parseDateOnly(value: string, field: string): Date {
    const date = new Date(`${value}T00:00:00.000Z`);
    if (
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== value
    ) {
      throw new BadRequestException(`${field} is invalid`);
    }
    return date;
  }

  private assertRange(startsOn: Date, endsOn: Date): void {
    if (endsOn < startsOn) {
      throw new BadRequestException('endsOn must be on or after startsOn');
    }
    const maximum = new Date(startsOn);
    maximum.setUTCMonth(maximum.getUTCMonth() + MAX_RANGE_MONTHS);
    if (endsOn > maximum) {
      throw new BadRequestException(
        `Recurrence range cannot exceed ${MAX_RANGE_MONTHS} months`,
      );
    }
  }

  private assertTimezone(timezone: string): void {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format();
    } catch {
      throw new BadRequestException(`Timezone ${timezone} is invalid`);
    }
  }

  private ruleInclude() {
    return {
      service: { select: { id: true, name: true } },
      branch: { select: { id: true, name: true } },
      instructor: { select: { id: true, name: true } },
      _count: { select: { sessions: true } },
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
  ): Promise<void> {
    const service = await this.prisma.service.findFirst({
      where: { id: serviceId, tenantId },
      select: { type: true, active: true },
    });
    if (!service) {
      throw new NotFoundException(`Service ${serviceId} not found in tenant`);
    }
    if (service.type !== ServiceType.POR_SESIONES) {
      throw new BadRequestException(
        'Recurrence requires a POR_SESIONES service',
      );
    }
    if (!service.active) {
      throw new BadRequestException('Service is inactive');
    }
  }

  private async resolveBranchId(
    tenantId: string,
    branchId?: string,
  ): Promise<string> {
    if (branchId) {
      await this.assertBranchInTenant(tenantId, branchId);
      return branchId;
    }
    const branch = await this.prisma.branch.findFirst({
      where: { tenantId, isDefault: true, active: true },
      select: { id: true },
    });
    if (!branch) {
      throw new BadRequestException('Tenant has no active default branch');
    }
    return branch.id;
  }

  private async assertBranchInTenant(
    tenantId: string,
    branchId: string,
  ): Promise<void> {
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, tenantId, active: true },
      select: { id: true },
    });
    if (!branch) {
      throw new BadRequestException(
        `Branch ${branchId} is not active in this tenant`,
      );
    }
  }

  private async assertInstructor(
    tenantId: string,
    instructorId: string,
  ): Promise<string> {
    const staff = await this.prisma.staffUser.findFirst({
      where: { id: instructorId, tenantId, active: true },
      select: { id: true },
    });
    if (!staff) {
      throw new BadRequestException(
        `Instructor ${instructorId} is not active staff of this tenant`,
      );
    }
    return staff.id;
  }

  private async findInTenant(
    tenantId: string,
    ruleId: string,
  ): Promise<RuleWithRelations> {
    const rule = await this.prisma.sessionRecurrenceRule.findFirst({
      where: { id: ruleId, tenantId },
      include: this.ruleInclude(),
    });
    if (!rule) {
      throw new NotFoundException(
        `Session recurrence rule ${ruleId} not found in tenant`,
      );
    }
    return rule;
  }

  private toDetail(rule: RuleWithRelations): RecurrenceRuleDetail {
    return {
      id: rule.id,
      tenantId: rule.tenantId,
      serviceId: rule.serviceId,
      serviceName: rule.service.name,
      branchId: rule.branchId,
      branchName: rule.branch.name,
      instructorId: rule.instructorId,
      instructorName: rule.instructor?.name ?? null,
      weekdays: rule.weekdays,
      localStartTime: rule.localStartTime,
      durationMinutes: rule.durationMinutes,
      timezone: rule.timezone,
      startsOn: rule.startsOn,
      endsOn: rule.endsOn,
      capacity: rule.capacity,
      active: rule.active,
      generatedSessionsCount: rule._count.sessions,
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
    };
  }

  private auditSnapshot(detail: RecurrenceRuleDetail): Prisma.InputJsonValue {
    return {
      serviceId: detail.serviceId,
      branchId: detail.branchId,
      instructorId: detail.instructorId,
      weekdays: detail.weekdays,
      localStartTime: detail.localStartTime,
      durationMinutes: detail.durationMinutes,
      timezone: detail.timezone,
      startsOn: detail.startsOn.toISOString().slice(0, 10),
      endsOn: detail.endsOn.toISOString().slice(0, 10),
      capacity: detail.capacity,
      active: detail.active,
      generatedSessionsCount: detail.generatedSessionsCount,
    };
  }
}
