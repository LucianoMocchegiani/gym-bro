import {
  BadRequestException,
  HttpException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import {
  AccessAttempt,
  AccessAttemptResult,
  ContractStatus,
  MemberStatus,
  ReservationStatus,
  SessionStatus,
  TenantStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TenantSettingsService } from '../tenant-settings/tenant-settings.service';
import {
  ACCESS_IDENTITY_PROVIDER,
  AccessIdentityProvider,
  AccessScanMode,
} from './access-identity.port';
import { VerifyAccessDto } from './dto/verify-access.dto';
import {
  ACCESS_REASON,
  AccessAttemptDetail,
  AccessReasonCode,
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
 * Verificación de ingreso en puerta (CU-ACC-001..003 / RN-ACC-004..009).
 *
 * @remarks Deuda real aún no modelada: `overdueDays = 0` (siempre dentro de tolerancia).
 * Persistencia siempre; presencia en reserva vía `checkedInAt` (RN-RES-007).
 */
@Injectable()
export class AccessVerifyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantSettings: TenantSettingsService,
    @Inject(ACCESS_IDENTITY_PROVIDER)
    private readonly identity: AccessIdentityProvider,
  ) {}

  /**
   * Resuelve identidad, evalúa derechos y registra el intento.
   *
   * @remarks HTTP 200 con `allowed` true/false (denegaciones de negocio no son 4xx).
   */
  async verify(
    tenantId: string,
    dto: VerifyAccessDto,
    actorStaffId: string,
  ): Promise<AccessVerifyResult> {
    const scanMode = dto.mode as AccessScanMode;
    let memberId: string | null = null;
    let credentialRef: string | null = null;

    try {
      const resolved = await this.identity.resolvePresentation({
        mode: scanMode,
        presentationToken: dto.presentationToken,
        venueToken: dto.venueToken,
        credentialRef: dto.credentialRef,
      });
      credentialRef = resolved.credentialRef;
      memberId = resolved.afiliadoId;

      if (resolved.tenantId !== tenantId) {
        return this.persistDenied({
          tenantId,
          memberId,
          credentialRef,
          scanMode,
          actorStaffId,
          reasonCode: ACCESS_REASON.tenantMismatch,
        });
      }

      return this.evaluateAndPersist({
        tenantId,
        memberId,
        credentialRef,
        scanMode,
        actorStaffId,
      });
    } catch (error: unknown) {
      if (
        error instanceof BadRequestException ||
        (error instanceof HttpException && error.getStatus() === 400)
      ) {
        return this.persistDenied({
          tenantId,
          memberId: null,
          credentialRef: null,
          scanMode,
          actorStaffId,
          reasonCode: ACCESS_REASON.payloadInvalido,
        });
      }
      if (
        error instanceof UnauthorizedException ||
        (error instanceof HttpException && error.getStatus() === 401)
      ) {
        return this.persistDenied({
          tenantId,
          memberId: null,
          credentialRef: null,
          scanMode,
          actorStaffId,
          reasonCode: ACCESS_REASON.credencialInvalida,
        });
      }
      throw error;
    }
  }

  /**
   * Historial de intentos del tenant (más recientes primero).
   */
  async listAttempts(
    tenantId: string,
    options: {
      memberId?: string;
      result?: AccessAttemptResult;
      limit?: number;
    } = {},
  ): Promise<AccessAttemptDetail[]> {
    const limit = Math.min(Math.max(options.limit ?? 50, 1), 200);
    const rows = await this.prisma.accessAttempt.findMany({
      where: {
        tenantId,
        ...(options.memberId ? { memberId: options.memberId } : {}),
        ...(options.result ? { result: options.result } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.map((r) => this.toAttemptDetail(r));
  }

  private async evaluateAndPersist(input: {
    tenantId: string;
    memberId: string;
    credentialRef: string;
    scanMode: AccessScanMode;
    actorStaffId: string;
  }): Promise<AccessVerifyResult> {
    const { tenantId, memberId, credentialRef, scanMode, actorStaffId } =
      input;

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

    const coverage = await this.resolveCoverage(tenantId, memberId);
    if (!coverage) {
      return this.persistDenied({
        tenantId,
        memberId,
        credentialRef,
        scanMode,
        actorStaffId,
        reasonCode: ACCESS_REASON.sinDerecho,
      });
    }

    const settings = await this.tenantSettings.get(tenantId);
    const overdueDays = await this.resolveOverdueDays(tenantId, memberId);
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
   * Derechos: reserva elegible en ventana o contrato ACCESO_LIBRE vigente.
   */
  private async resolveCoverage(
    tenantId: string,
    memberId: string,
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

    return null;
  }

  /**
   * Días de atraso de deuda. Placeholder: siempre 0 hasta modelo de deuda.
   */
  private async resolveOverdueDays(
    _tenantId: string,
    _memberId: string,
  ): Promise<number> {
    return 0;
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
        createdAt: { gte: start, lt: end },
      },
    });
  }

  private async persistAllowed(input: {
    tenantId: string;
    memberId: string;
    credentialRef: string;
    scanMode: AccessScanMode;
    actorStaffId: string;
    reasonCode: AccessReasonCode;
    reservationId: string | null;
    sessionId: string | null;
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
      reservationId: input.reservationId,
      sessionId: input.sessionId,
      checkedInAt,
      attempt: this.toAttemptDetail(attempt),
    };
  }

  private async persistDenied(input: {
    tenantId: string;
    memberId: string | null;
    credentialRef: string | null;
    scanMode: AccessScanMode;
    actorStaffId: string;
    reasonCode: AccessReasonCode;
  }): Promise<AccessVerifyResult> {
    const attempt = await this.prisma.accessAttempt.create({
      data: {
        tenantId: input.tenantId,
        memberId: input.memberId,
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
      reservationId: null,
      sessionId: null,
      checkedInAt: null,
      attempt: this.toAttemptDetail(attempt),
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
    return new Date(`${ymd}T03:00:00.000Z`);
  }

  private toAttemptDetail(row: AccessAttempt): AccessAttemptDetail {
    return {
      id: row.id,
      tenantId: row.tenantId,
      memberId: row.memberId,
      credentialRef: row.credentialRef,
      result: row.result,
      reasonCode: row.reasonCode,
      scanMode: row.scanMode,
      reservationId: row.reservationId,
      sessionId: row.sessionId,
      manualPass: row.manualPass,
      actorStaffId: row.actorStaffId,
      createdAt: row.createdAt,
    };
  }
}
