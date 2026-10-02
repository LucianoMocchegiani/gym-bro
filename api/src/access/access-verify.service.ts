import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AccessAttempt,
  AccessAttemptResult,
  ContractStatus,
  ContractType,
  MemberStatus,
  Prisma,
  ReservationStatus,
  SessionStatus,
  TenantStatus,
} from '@prisma/client';
import { AUDIT_ACTIONS } from '../audit/audit.types';
import { AuditService } from '../audit/audit.service';
import { ListResult, normalizeListQuery, toListResult } from '../common/list';
import { PrismaService } from '../prisma/prisma.service';
import { TenantSettingsService } from '../tenant-settings/tenant-settings.service';
import { ListAccessAttemptsQueryDto } from './dto/list-access-attempts.dto';
import { ManualPassDto } from './dto/manual-pass.dto';
import {
  ACCESS_CHANNEL,
  ACCESS_REASON,
  ACCESS_REASON_LABEL,
  AccessAttemptDetail,
  AccessEntryOrigin,
  AccessPreviewResult,
  AccessReasonCode,
  AccessSubject,
  AccessVerifyResult,
} from './access.types';

/** Origen de persistencia: el pase manual no tiene referencia de sistema de puerta. */
type PersistOrigin = Omit<AccessEntryOrigin, 'scanMode' | 'credentialRef'> & {
  scanMode: AccessEntryOrigin['scanMode'] | 'manual';
  credentialRef: string | null;
};

/** Misma zona que caja para “día” de multi-ingreso. */
const ACCESS_TIMEZONE = 'America/Argentina/Buenos_Aires';

/** Ventana previa al inicio de sesión para asociar reserva (minutos). */
const SESSION_EARLY_MINUTES = 30;

type AccessDecision = {
  allowed: boolean;
  reasonCode: AccessReasonCode;
  reservationId: string | null;
  sessionId: string | null;
  overdueDays: number;
  debtToleranceDays: number;
};

type CoverageHit = {
  reasonCode: AccessReasonCode;
  reservationId: string | null;
  sessionId: string | null;
};

/**
 * Evaluación de derechos de ingreso y pase manual (CU-ACC-001..004 / RN-ACC-004..009).
 *
 * @remarks No sabe de sistemas de puerta: Kuatia (`AccessOid4VpService`) y ZKTeco
 * (`AccessZktecoService`) resuelven la identidad y entran por `evaluateSubject`.
 * Deuda = días calendario (BA) desde `endsAt` del último contrato libre ACTIVE;
 * si `0 ≤ overdue ≤ debtToleranceDays` permite ingreso aunque el pack ya venció.
 * Pases manuales no cuentan para el tope de multi-ingreso.
 */
@Injectable()
export class AccessVerifyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantSettings: TenantSettingsService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Evalúa y persiste el ingreso de alguien ya identificado por un sistema de puerta.
   *
   * @remarks Única entrada a las reglas de Faciliter (RN-ACC-004..009 socio,
   * RN-ACC-008 staff). Kuatia (OID4VP) y ZKTeco llegan acá con el mismo contrato;
   * `origin.channel` solo queda en el historial. El tenant viene del contexto
   * autenticado, nunca del sistema de puerta.
   */
  async evaluateSubject(
    subject: AccessSubject,
    origin: AccessEntryOrigin,
  ): Promise<AccessVerifyResult> {
    if (subject.kind === 'staff') {
      return this.evaluateStaff(subject.staffUserId, origin);
    }
    return this.evaluateAndPersist({ memberId: subject.memberId, origin });
  }

  /**
   * Simula si el afiliado podría ingresar ahora, **sin** escribir `access_attempts`
   * ni marcar asistencia.
   *
   * @remarks Mismas RN-ACC-004..007 que la puerta. No incrementa multi-ingreso.
   * @throws {NotFoundException} Si el afiliado no existe en el tenant.
   */
  async previewMemberAccess(
    tenantId: string,
    memberId: string,
  ): Promise<AccessPreviewResult> {
    const member = await this.prisma.member.findFirst({
      where: { id: memberId, tenantId },
      select: { id: true, status: true },
    });
    if (!member) {
      throw new NotFoundException(`Member ${memberId} not found in tenant`);
    }
    const decision = await this.evaluateDecision(tenantId, member);
    return {
      allowed: decision.allowed,
      reasonCode: decision.reasonCode,
      reasonLabel: ACCESS_REASON_LABEL[decision.reasonCode],
      memberId: member.id,
      reservationId: decision.reservationId,
      sessionId: decision.sessionId,
      overdueDays: decision.overdueDays,
      debtToleranceDays: decision.debtToleranceDays,
    };
  }

  /**
   * Persiste un deny cuando el sistema de puerta no pudo identificar a nadie válido.
   *
   * @remarks Sin pasar por las reglas: payload inválido, gym de la credencial
   * distinto (`tenant_mismatch`) o número de aparato sin vínculo (`sin_vinculo`).
   */
  async persistIdentityDenied(input: {
    origin: AccessEntryOrigin;
    memberId: string | null;
    subjectStaffId: string | null;
    reasonCode: AccessReasonCode;
  }): Promise<AccessVerifyResult> {
    return this.persistDenied({
      origin: input.origin,
      memberId: input.memberId,
      subjectStaffId: input.subjectStaffId,
      reasonCode: input.reasonCode,
    });
  }

  /**
   * Regla de staff: entra si existe en el tenant y está activo (sin pack/deuda/fichaje).
   *
   * @remarks RN-ACC-008. Roles no intervienen.
   */
  private async evaluateStaff(
    staffUserId: string,
    origin: AccessEntryOrigin,
  ): Promise<AccessVerifyResult> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: origin.tenantId },
      select: { status: true },
    });
    if (!tenant || tenant.status === TenantStatus.SUSPENDED) {
      return this.persistDenied({
        origin,
        memberId: null,
        subjectStaffId: staffUserId,
        reasonCode: ACCESS_REASON.tenantSuspendido,
      });
    }

    const staff = await this.prisma.staffUser.findFirst({
      where: { id: staffUserId, tenantId: origin.tenantId },
      select: { id: true, active: true, name: true, email: true },
    });
    if (!staff) {
      return this.persistDenied({
        origin,
        memberId: null,
        subjectStaffId: null,
        reasonCode: ACCESS_REASON.credencialInvalida,
      });
    }
    if (!staff.active) {
      return this.persistDenied({
        origin,
        memberId: null,
        subjectStaffId: staff.id,
        reasonCode: ACCESS_REASON.staffInactivo,
      });
    }

    const attempt = await this.prisma.accessAttempt.create({
      data: {
        tenantId: origin.tenantId,
        memberId: null,
        subjectStaffId: staff.id,
        credentialRef: origin.credentialRef,
        result: AccessAttemptResult.ALLOWED,
        reasonCode: ACCESS_REASON.okStaff,
        scanMode: origin.scanMode,
        channel: origin.channel,
        actorStaffId: origin.actorStaffId,
      },
    });

    return {
      allowed: true,
      reasonCode: ACCESS_REASON.okStaff,
      memberId: null,
      subjectStaffId: staff.id,
      reservationId: null,
      sessionId: null,
      checkedInAt: null,
      attempt: this.toAttemptDetail(attempt, null, staff),
    };
  }

  /**
   * Mapea un `access_attempt` existente a `AccessVerifyResult` (poll idempotente).
   */
  toVerifyResultFromAttempt(
    row: AccessAttempt,
    member: { name: string | null; email: string | null } | null,
    subjectStaff?: { name: string | null; email: string | null } | null,
  ): AccessVerifyResult {
    const attempt = this.toAttemptDetail(row, member, subjectStaff);
    return {
      allowed: row.result === AccessAttemptResult.ALLOWED,
      reasonCode: row.reasonCode,
      memberId: row.memberId,
      subjectStaffId: row.subjectStaffId,
      reservationId: row.reservationId,
      sessionId: row.sessionId,
      checkedInAt: null,
      attempt,
    };
  }

  /**
   * Historial de intentos del tenant (paginado; más recientes primero).
   */
  async listAttempts(
    tenantId: string,
    query: ListAccessAttemptsQueryDto = {},
  ): Promise<ListResult<AccessAttemptDetail>> {
    const n = normalizeListQuery(query);
    let createdAtFilter: { gte?: Date; lt?: Date } | undefined;
    if (query.from || query.to) {
      const from = query.from;
      const to = query.to;
      if (from && to && from > to) {
        throw new BadRequestException('from must be <= to');
      }
      createdAtFilter = {};
      if (from) {
        createdAtFilter.gte = this.zonedDayStartUtc(from);
      }
      if (to) {
        const next = this.addDaysYmd(to, 1);
        createdAtFilter.lt = this.zonedDayStartUtc(next);
      }
    }
    const where: Prisma.AccessAttemptWhereInput = {
      tenantId,
      ...(query.memberId ? { memberId: query.memberId } : {}),
      ...(query.result ? { result: query.result } : {}),
      ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.accessAttempt.findMany({
        where,
        orderBy: { createdAt: n.order },
        skip: n.skip,
        take: n.take,
        include: {
          member: { select: { name: true, email: true } },
          subjectStaff: { select: { name: true, email: true } },
        },
      }),
      this.prisma.accessAttempt.count({ where }),
    ]);
    return toListResult(
      rows.map((r) => this.toAttemptDetail(r, r.member, r.subjectStaff)),
      total,
      n.page,
      n.pageSize,
    );
  }

  /**
   * Otorga ingreso manual a un afiliado existente (CU-ACC-004 / RN-ACC-006).
   *
   * @remarks Saltea derechos/deuda/multi-ingreso. No consume cupo diario de QR.
   * @throws {NotFoundException} Member inexistente.
   * @throws {BadRequestException} Tenant/member no ACTIVE, o sesión sin reserva.
   */
  async manualPass(
    tenantId: string,
    memberId: string,
    dto: ManualPassDto,
    actorStaffId: string,
  ): Promise<AccessVerifyResult> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { status: true },
    });
    if (!tenant || tenant.status === TenantStatus.SUSPENDED) {
      throw new BadRequestException('Tenant is not active');
    }

    const member = await this.prisma.member.findFirst({
      where: { id: memberId, tenantId },
      select: { id: true, status: true },
    });
    if (!member) {
      throw new NotFoundException(`Member ${memberId} not found`);
    }
    if (member.status !== MemberStatus.ACTIVE) {
      throw new BadRequestException('Member must be ACTIVE for manual pass');
    }

    let reservationId: string | null = null;
    let sessionId: string | null = null;
    if (dto.sessionId) {
      const reservation = await this.prisma.reservation.findFirst({
        where: {
          tenantId,
          memberId,
          sessionId: dto.sessionId,
          status: ReservationStatus.CONFIRMED,
          session: { status: SessionStatus.PUBLISHED },
        },
        select: { id: true, sessionId: true },
      });
      if (!reservation) {
        throw new BadRequestException(
          'No confirmed reservation for member on that session',
        );
      }
      reservationId = reservation.id;
      sessionId = reservation.sessionId;
    }

    const note = dto.note?.trim() ? dto.note.trim() : null;
    const result = await this.persistAllowed({
      origin: {
        tenantId,
        channel: ACCESS_CHANNEL.manual,
        scanMode: 'manual',
        credentialRef: null,
        actorStaffId,
      },
      memberId,
      reasonCode: ACCESS_REASON.okPaseManual,
      reservationId,
      sessionId,
      manualPass: true,
      motiveCode: dto.motiveCode,
      note,
    });

    await this.audit.record({
      tenantId,
      actor: { profileType: 'STAFF', userId: actorStaffId },
      action: AUDIT_ACTIONS.accessManualPass,
      entityType: 'access_attempt',
      entityId: result.attempt.id,
      after: {
        memberId,
        motiveCode: dto.motiveCode,
        note,
        sessionId,
        reservationId,
        reasonCode: ACCESS_REASON.okPaseManual,
      },
    });

    return result;
  }

  private async evaluateAndPersist(input: {
    memberId: string;
    origin: AccessEntryOrigin;
  }): Promise<AccessVerifyResult> {
    const { memberId, origin } = input;

    const member = await this.prisma.member.findFirst({
      where: { id: memberId, tenantId: origin.tenantId },
      select: { id: true, status: true },
    });

    const decision = await this.evaluateDecision(origin.tenantId, member);
    if (!decision.allowed) {
      return this.persistDenied({
        origin,
        memberId: member ? memberId : null,
        subjectStaffId: null,
        reasonCode: decision.reasonCode,
      });
    }

    return this.persistAllowed({
      origin,
      memberId,
      reasonCode: decision.reasonCode,
      reservationId: decision.reservationId,
      sessionId: decision.sessionId,
    });
  }

  /**
   * Decisión de ingreso sin persistir (RN-ACC-004..007).
   *
   * @param member `null` si el id no está en el tenant (OID4VP / persist → deny).
   */
  private async evaluateDecision(
    tenantId: string,
    member: { id: string; status: MemberStatus } | null,
  ): Promise<AccessDecision> {
    const empty: Pick<
      AccessDecision,
      'reservationId' | 'sessionId' | 'overdueDays' | 'debtToleranceDays'
    > = {
      reservationId: null,
      sessionId: null,
      overdueDays: 0,
      debtToleranceDays: 0,
    };

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { status: true },
    });
    if (!tenant || tenant.status === TenantStatus.SUSPENDED) {
      return {
        allowed: false,
        reasonCode: ACCESS_REASON.tenantSuspendido,
        ...empty,
      };
    }

    if (!member || member.status !== MemberStatus.ACTIVE) {
      return {
        allowed: false,
        reasonCode: ACCESS_REASON.afiliadoInactivo,
        ...empty,
      };
    }

    const settings = await this.tenantSettings.get(tenantId);
    const overdueDays = await this.resolveOverdueDays(tenantId, member.id);
    const coverage = await this.resolveCoverage(
      tenantId,
      member.id,
      overdueDays,
      settings.debtToleranceDays,
    );
    if (!coverage) {
      const reasonCode =
        overdueDays > settings.debtToleranceDays
          ? ACCESS_REASON.deudaExcedida
          : ACCESS_REASON.sinDerecho;
      return {
        allowed: false,
        reasonCode,
        overdueDays,
        debtToleranceDays: settings.debtToleranceDays,
        reservationId: null,
        sessionId: null,
      };
    }

    if (overdueDays > settings.debtToleranceDays) {
      return {
        allowed: false,
        reasonCode: ACCESS_REASON.deudaExcedida,
        overdueDays,
        debtToleranceDays: settings.debtToleranceDays,
        reservationId: null,
        sessionId: null,
      };
    }

    const maxPerDay = settings.multiEntryEnabled
      ? Math.max(1, settings.multiEntryMaxPerDay)
      : 1;
    const allowedToday = await this.countAllowedToday(tenantId, member.id);
    if (allowedToday >= maxPerDay) {
      return {
        allowed: false,
        reasonCode: ACCESS_REASON.multiIngresoExcedido,
        overdueDays,
        debtToleranceDays: settings.debtToleranceDays,
        reservationId: coverage.reservationId,
        sessionId: coverage.sessionId,
      };
    }

    return {
      allowed: true,
      reasonCode: coverage.reasonCode,
      overdueDays,
      debtToleranceDays: settings.debtToleranceDays,
      reservationId: coverage.reservationId,
      sessionId: coverage.sessionId,
    };
  }

  /**
   * Derechos: reserva en ventana, contrato ACCESO_LIBRE vigente, o gracia por deuda
   * (RN-ACC-004 / RN-ACC-005).
   */
  private async resolveCoverage(
    tenantId: string,
    memberId: string,
    overdueDays: number,
    debtToleranceDays: number,
  ): Promise<CoverageHit | null> {
    const now = new Date();
    const earlyMs = SESSION_EARLY_MINUTES * 60 * 1000;
    const windowEnd = new Date(now.getTime() + earlyMs);

    const reservation = await this.prisma.reservation.findFirst({
      where: {
        tenantId,
        memberId,
        status: ReservationStatus.CONFIRMED,
        session: {
          status: SessionStatus.PUBLISHED,
          startsAt: { lte: windowEnd },
          endsAt: { gte: now },
        },
      },
      orderBy: { session: { startsAt: 'asc' } },
      select: {
        id: true,
        sessionId: true,
      },
    });
    if (reservation) {
      return {
        reasonCode: ACCESS_REASON.okReserva,
        reservationId: reservation.id,
        sessionId: reservation.sessionId,
      };
    }

    const libre = await this.prisma.contract.findFirst({
      where: {
        tenantId,
        memberId,
        status: ContractStatus.ACTIVE,
        hasAccessLibre: true,
        contractType: ContractType.MEMBER,
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gte: now } }],
      },
      select: { id: true },
    });
    if (libre) {
      return {
        reasonCode: ACCESS_REASON.okAccesoLibre,
        reservationId: null,
        sessionId: null,
      };
    }

    if (overdueDays >= 0 && overdueDays <= debtToleranceDays) {
      const expiredLibre = await this.findLatestLibreContract(
        tenantId,
        memberId,
      );
      if (
        expiredLibre?.endsAt &&
        expiredLibre.endsAt < now &&
        expiredLibre.startsAt <= now
      ) {
        return {
          reasonCode: ACCESS_REASON.okDeudaTolerancia,
          reservationId: null,
          sessionId: null,
        };
      }
    }

    return null;
  }

  /**
   * Días de atraso desde el `endsAt` del último contrato libre ACTIVE (RN-ACC-005).
   *
   * @returns `0` si no hay contrato, vigencia abierta, o aún no venció.
   */
  private async resolveOverdueDays(
    tenantId: string,
    memberId: string,
  ): Promise<number> {
    const latest = await this.findLatestLibreContract(tenantId, memberId);
    if (!latest?.endsAt) {
      return 0;
    }
    const now = new Date();
    if (latest.endsAt >= now) {
      return 0;
    }
    return this.calendarDaysBetween(latest.endsAt, now);
  }

  private async findLatestLibreContract(
    tenantId: string,
    memberId: string,
  ): Promise<{ startsAt: Date; endsAt: Date | null } | null> {
    return this.prisma.contract.findFirst({
      where: {
        tenantId,
        memberId,
        status: ContractStatus.ACTIVE,
        hasAccessLibre: true,
        contractType: ContractType.MEMBER,
      },
      orderBy: [{ endsAt: 'desc' }, { startsAt: 'desc' }],
      select: { startsAt: true, endsAt: true },
    });
  }

  /**
   * Días calendario entre dos instantes en timezone BA (mismo día → 0).
   */
  private calendarDaysBetween(from: Date, to: Date): number {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: ACCESS_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const fromYmd = formatter.format(from);
    const toYmd = formatter.format(to);
    const fromUtc = Date.parse(`${fromYmd}T00:00:00.000Z`);
    const toUtc = Date.parse(`${toYmd}T00:00:00.000Z`);
    return Math.max(0, Math.round((toUtc - fromUtc) / (24 * 60 * 60 * 1000)));
  }

  private async countAllowedToday(
    tenantId: string,
    memberId: string,
  ): Promise<number> {
    const { start, end } = this.businessDayBounds(new Date());
    return this.prisma.accessAttempt.count({
      where: {
        tenantId,
        memberId,
        result: AccessAttemptResult.ALLOWED,
        manualPass: false,
        createdAt: { gte: start, lt: end },
      },
    });
  }

  private async persistAllowed(input: {
    origin: PersistOrigin;
    memberId: string;
    reasonCode: AccessReasonCode;
    reservationId: string | null;
    sessionId: string | null;
    manualPass?: boolean;
    motiveCode?: string | null;
    note?: string | null;
  }): Promise<AccessVerifyResult> {
    const { origin } = input;
    const now = new Date();
    const { attempt, checkedInAt } = await this.prisma.$transaction(
      async (tx) => {
        let checkedInAt: Date | null = null;
        if (input.reservationId) {
          const reservation = await tx.reservation.findFirst({
            where: {
              id: input.reservationId,
              tenantId: origin.tenantId,
              memberId: input.memberId,
            },
            select: { id: true, checkedInAt: true },
          });
          if (reservation && !reservation.checkedInAt) {
            const updated = await tx.reservation.update({
              where: { id: reservation.id },
              data: { checkedInAt: now },
              select: { checkedInAt: true },
            });
            checkedInAt = updated.checkedInAt;
          } else {
            checkedInAt = reservation?.checkedInAt ?? null;
          }
        }

        const attempt = await tx.accessAttempt.create({
          data: {
            tenantId: origin.tenantId,
            memberId: input.memberId,
            credentialRef: origin.credentialRef,
            result: AccessAttemptResult.ALLOWED,
            reasonCode: input.reasonCode,
            scanMode: origin.scanMode,
            channel: origin.channel,
            reservationId: input.reservationId,
            sessionId: input.sessionId,
            manualPass: input.manualPass ?? false,
            motiveCode: input.motiveCode ?? null,
            note: input.note ?? null,
            actorStaffId: origin.actorStaffId,
          },
        });
        return { attempt, checkedInAt };
      },
    );

    return {
      allowed: true,
      reasonCode: input.reasonCode,
      memberId: input.memberId,
      subjectStaffId: null,
      reservationId: input.reservationId,
      sessionId: input.sessionId,
      checkedInAt,
      attempt: await this.toAttemptDetailAsync(attempt),
    };
  }

  private async persistDenied(input: {
    origin: AccessEntryOrigin;
    memberId: string | null;
    subjectStaffId: string | null;
    reasonCode: AccessReasonCode;
  }): Promise<AccessVerifyResult> {
    const { origin } = input;
    const attempt = await this.prisma.accessAttempt.create({
      data: {
        tenantId: origin.tenantId,
        memberId: input.memberId,
        subjectStaffId: input.subjectStaffId,
        credentialRef: origin.credentialRef,
        result: AccessAttemptResult.DENIED,
        reasonCode: input.reasonCode,
        scanMode: origin.scanMode,
        channel: origin.channel,
        actorStaffId: origin.actorStaffId,
      },
    });
    return {
      allowed: false,
      reasonCode: input.reasonCode,
      memberId: input.memberId,
      subjectStaffId: input.subjectStaffId,
      reservationId: null,
      sessionId: null,
      checkedInAt: null,
      attempt: await this.toAttemptDetailAsync(attempt),
    };
  }

  /**
   * Inicio/fin UTC del día calendario en timezone BA.
   */
  private businessDayBounds(at: Date): { start: Date; end: Date } {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: ACCESS_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const ymd = formatter.format(at);
    const start = this.zonedDayStartUtc(ymd);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    return { start, end };
  }

  /**
   * Medianoche BA del YMD como instante UTC (aprox. vía offset fijo -03).
   *
   * @remarks BA sin DST desde 2009; suficiente para MVP de multi-ingreso.
   */
  private zonedDayStartUtc(ymd: string): Date {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
      throw new BadRequestException('from/to must be YYYY-MM-DD');
    }
    return new Date(`${ymd}T03:00:00.000Z`);
  }

  private addDaysYmd(ymd: string, days: number): string {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
    if (!match) {
      throw new BadRequestException('from/to must be YYYY-MM-DD');
    }
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day + days));
    const yy = date.getUTCFullYear();
    const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(date.getUTCDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
  }

  private async toAttemptDetailAsync(
    row: AccessAttempt,
  ): Promise<AccessAttemptDetail> {
    let member: { name: string | null; email: string | null } | null = null;
    let subjectStaff: { name: string | null; email: string | null } | null =
      null;
    if (row.memberId) {
      member = await this.prisma.member.findFirst({
        where: { id: row.memberId, tenantId: row.tenantId },
        select: { name: true, email: true },
      });
    }
    if (row.subjectStaffId) {
      subjectStaff = await this.prisma.staffUser.findFirst({
        where: { id: row.subjectStaffId, tenantId: row.tenantId },
        select: { name: true, email: true },
      });
    }
    return this.toAttemptDetail(row, member, subjectStaff);
  }

  private toAttemptDetail(
    row: AccessAttempt,
    member?: { name: string | null; email: string | null } | null,
    subjectStaff?: { name: string | null; email: string | null } | null,
  ): AccessAttemptDetail {
    return {
      id: row.id,
      tenantId: row.tenantId,
      memberId: row.memberId,
      memberName: member?.name ?? null,
      memberEmail: member?.email ?? null,
      subjectStaffId: row.subjectStaffId,
      subjectStaffName: subjectStaff?.name ?? null,
      subjectStaffEmail: subjectStaff?.email ?? null,
      credentialRef: row.credentialRef,
      result: row.result,
      reasonCode: row.reasonCode,
      scanMode: row.scanMode,
      channel: row.channel,
      reservationId: row.reservationId,
      sessionId: row.sessionId,
      manualPass: row.manualPass,
      motiveCode: row.motiveCode,
      note: row.note,
      actorStaffId: row.actorStaffId,
      createdAt: row.createdAt,
    };
  }
}
