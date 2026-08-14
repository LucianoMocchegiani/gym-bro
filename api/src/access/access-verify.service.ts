import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AccessAttempt,
  AccessAttemptResult,
  ContractStatus,
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
  ACCESS_REASON,
  AccessAttemptDetail,
  AccessReasonCode,
  AccessScanMode,
  AccessVerifyResult,
} from './access.types';

/** Misma zona que caja para “día” de multi-ingreso. */
const ACCESS_TIMEZONE = 'America/Argentina/Buenos_Aires';

/** Ventana previa al inicio de sesión para asociar reserva (minutos). */
const SESSION_EARLY_MINUTES = 30;

type CoverageHit = {
  reasonCode: AccessReasonCode;
  reservationId: string | null;
  sessionId: string | null;
};

/**
 * Evaluación de derechos de ingreso y pase manual (CU-ACC-001..004 / RN-ACC-004..009).
 *
 * @remarks Identidad OID4VP llega desde `AccessOid4VpService` (claim `memberId`).
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
   * Evalúa derechos tras una presentación OID4VP ya resuelta a `memberId`.
   *
   * @remarks CU-ACC-001 / RN-ACC-003 (`member_scans_gym`).
   */
  async evaluateOid4VpPresentation(input: {
    tenantId: string;
    memberId: string;
    credentialRef: string;
    actorStaffId: string | null;
  }): Promise<AccessVerifyResult> {
    return this.evaluateAndPersist({
      ...input,
      scanMode: 'member_scans_gym',
    });
  }

  /**
   * Persiste un deny OID4VP sin pasar por evaluate (payload / tenant mismatch).
   */
  async persistOid4VpDenied(input: {
    tenantId: string;
    memberId: string | null;
    subjectStaffId?: string | null;
    credentialRef: string;
    actorStaffId: string | null;
    reasonCode: AccessReasonCode;
  }): Promise<AccessVerifyResult> {
    return this.persistDenied({
      tenantId: input.tenantId,
      memberId: input.memberId,
      subjectStaffId: input.subjectStaffId ?? null,
      credentialRef: input.credentialRef,
      scanMode: 'member_scans_gym',
      actorStaffId: input.actorStaffId,
      reasonCode: input.reasonCode,
    });
  }

  /**
   * Evalúa ingreso de staff tras OID4VP (VC de vínculo; sin pack/deuda/fichaje).
   *
   * @remarks Allow si el staff existe en el tenant y `active`. Roles no van en la VC.
   */
  async evaluateStaffOid4VpPresentation(input: {
    tenantId: string;
    staffUserId: string;
    credentialRef: string;
    actorStaffId: string | null;
  }): Promise<AccessVerifyResult> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: input.tenantId },
      select: { status: true },
    });
    if (!tenant || tenant.status === TenantStatus.SUSPENDED) {
      return this.persistDenied({
        tenantId: input.tenantId,
        memberId: null,
        subjectStaffId: input.staffUserId,
        credentialRef: input.credentialRef,
        scanMode: 'member_scans_gym',
        actorStaffId: input.actorStaffId,
        reasonCode: ACCESS_REASON.tenantSuspendido,
      });
    }

    const staff = await this.prisma.staffUser.findFirst({
      where: { id: input.staffUserId, tenantId: input.tenantId },
      select: { id: true, active: true, name: true, email: true },
    });
    if (!staff) {
      return this.persistDenied({
        tenantId: input.tenantId,
        memberId: null,
        subjectStaffId: null,
        credentialRef: input.credentialRef,
        scanMode: 'member_scans_gym',
        actorStaffId: input.actorStaffId,
        reasonCode: ACCESS_REASON.credencialInvalida,
      });
    }
    if (!staff.active) {
      return this.persistDenied({
        tenantId: input.tenantId,
        memberId: null,
        subjectStaffId: staff.id,
        credentialRef: input.credentialRef,
        scanMode: 'member_scans_gym',
        actorStaffId: input.actorStaffId,
        reasonCode: ACCESS_REASON.staffInactivo,
      });
    }

    const attempt = await this.prisma.accessAttempt.create({
      data: {
        tenantId: input.tenantId,
        memberId: null,
        subjectStaffId: staff.id,
        credentialRef: input.credentialRef,
        result: AccessAttemptResult.ALLOWED,
        reasonCode: ACCESS_REASON.okStaff,
        scanMode: 'member_scans_gym',
        actorStaffId: input.actorStaffId,
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
      tenantId,
      memberId,
      credentialRef: null,
      scanMode: 'manual',
      actorStaffId,
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
    tenantId: string;
    memberId: string;
    credentialRef: string;
    scanMode: AccessScanMode;
    actorStaffId: string | null;
  }): Promise<AccessVerifyResult> {
    const { tenantId, memberId, credentialRef, scanMode, actorStaffId } = input;

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { status: true },
    });
    if (!tenant || tenant.status === TenantStatus.SUSPENDED) {
      return this.persistDenied({
        tenantId,
        memberId,
        credentialRef,
        scanMode,
        actorStaffId,
        reasonCode: ACCESS_REASON.tenantSuspendido,
      });
    }

    const member = await this.prisma.member.findFirst({
      where: { id: memberId, tenantId },
      select: { id: true, status: true },
    });
    if (!member || member.status !== MemberStatus.ACTIVE) {
      return this.persistDenied({
        tenantId,
        memberId,
        credentialRef,
        scanMode,
        actorStaffId,
        reasonCode: ACCESS_REASON.afiliadoInactivo,
      });
    }

    const settings = await this.tenantSettings.get(tenantId);
    const overdueDays = await this.resolveOverdueDays(tenantId, memberId);
    const coverage = await this.resolveCoverage(
      tenantId,
      memberId,
      overdueDays,
      settings.debtToleranceDays,
    );
    if (!coverage) {
      if (overdueDays > settings.debtToleranceDays) {
        return this.persistDenied({
          tenantId,
          memberId,
          credentialRef,
          scanMode,
          actorStaffId,
          reasonCode: ACCESS_REASON.deudaExcedida,
        });
      }
      return this.persistDenied({
        tenantId,
        memberId,
        credentialRef,
        scanMode,
        actorStaffId,
        reasonCode: ACCESS_REASON.sinDerecho,
      });
    }

    if (overdueDays > settings.debtToleranceDays) {
      return this.persistDenied({
        tenantId,
        memberId,
        credentialRef,
        scanMode,
        actorStaffId,
        reasonCode: ACCESS_REASON.deudaExcedida,
      });
    }

    const maxPerDay = settings.multiEntryEnabled
      ? Math.max(1, settings.multiEntryMaxPerDay)
      : 1;
    const allowedToday = await this.countAllowedToday(tenantId, memberId);
    if (allowedToday >= maxPerDay) {
      return this.persistDenied({
        tenantId,
        memberId,
        credentialRef,
        scanMode,
        actorStaffId,
        reasonCode: ACCESS_REASON.multiIngresoExcedido,
      });
    }

    return this.persistAllowed({
      tenantId,
      memberId,
      credentialRef,
      scanMode,
      actorStaffId,
      reasonCode: coverage.reasonCode,
      reservationId: coverage.reservationId,
      sessionId: coverage.sessionId,
    });
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
    tenantId: string;
    memberId: string;
    credentialRef: string | null;
    scanMode: AccessScanMode | 'manual';
    actorStaffId: string | null;
    reasonCode: AccessReasonCode;
    reservationId: string | null;
    sessionId: string | null;
    manualPass?: boolean;
    motiveCode?: string | null;
    note?: string | null;
  }): Promise<AccessVerifyResult> {
    const now = new Date();
    const { attempt, checkedInAt } = await this.prisma.$transaction(
      async (tx) => {
        let checkedInAt: Date | null = null;
        if (input.reservationId) {
          const reservation = await tx.reservation.findFirst({
            where: {
              id: input.reservationId,
              tenantId: input.tenantId,
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
            tenantId: input.tenantId,
            memberId: input.memberId,
            credentialRef: input.credentialRef,
            result: AccessAttemptResult.ALLOWED,
            reasonCode: input.reasonCode,
            scanMode: input.scanMode,
            reservationId: input.reservationId,
            sessionId: input.sessionId,
            manualPass: input.manualPass ?? false,
            motiveCode: input.motiveCode ?? null,
            note: input.note ?? null,
            actorStaffId: input.actorStaffId,
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
    tenantId: string;
    memberId: string | null;
    subjectStaffId?: string | null;
    credentialRef: string | null;
    scanMode: AccessScanMode;
    actorStaffId: string | null;
    reasonCode: AccessReasonCode;
  }): Promise<AccessVerifyResult> {
    const attempt = await this.prisma.accessAttempt.create({
      data: {
        tenantId: input.tenantId,
        memberId: input.memberId,
        subjectStaffId: input.subjectStaffId ?? null,
        credentialRef: input.credentialRef,
        result: AccessAttemptResult.DENIED,
        reasonCode: input.reasonCode,
        scanMode: input.scanMode,
        actorStaffId: input.actorStaffId,
      },
    });
    return {
      allowed: false,
      reasonCode: input.reasonCode,
      memberId: input.memberId,
      subjectStaffId: input.subjectStaffId ?? null,
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
