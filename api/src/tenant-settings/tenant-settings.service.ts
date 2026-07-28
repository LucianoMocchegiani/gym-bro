import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, WaitlistMode } from '@prisma/client';
import { AUDIT_ACTIONS, AuditActor } from '../audit/audit.types';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateTenantSettingsDto } from './dto/tenant-settings.dto';
import { TenantSettingsDetail } from './tenant-settings.types';

const DEFAULT_CANCELLATION_HOURS = 6;
const DEFAULT_WAITLIST_MODE = WaitlistMode.AUTO_ASSIGN;
const DEFAULT_ALLOW_LATE_ENTRY = false;
const DEFAULT_DEBT_TOLERANCE_DAYS = 15;
const DEFAULT_MULTI_ENTRY_ENABLED = false;
const DEFAULT_MULTI_ENTRY_MAX = 1;

/**
 * Configuración operativa del gym (RN-TEN-004..007 / RN-RES-006).
 *
 * @remarks Horas de cancelación, waitlist, ingreso tardío, deuda y multi-ingreso.
 * Si el row no existe (tenants legacy), se crea con defaults.
 */
@Injectable()
export class TenantSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Lee settings del tenant (crea defaults si faltan).
   */
  async get(tenantId: string): Promise<TenantSettingsDetail> {
    await this.assertTenantExists(tenantId);
    const settings = await this.getOrCreate(tenantId);
    return this.toDetail(settings);
  }

  /**
   * Actualiza campos enviados; crea row si no existía.
   *
   * @throws {BadRequestException} Si el body no trae ningún campo.
   */
  async update(
    tenantId: string,
    dto: UpdateTenantSettingsDto,
    actor: AuditActor,
  ): Promise<TenantSettingsDetail> {
    if (
      dto.reservationCancellationHours === undefined &&
      dto.waitlistMode === undefined &&
      dto.allowLateSessionEntry === undefined &&
      dto.debtToleranceDays === undefined &&
      dto.multiEntryEnabled === undefined &&
      dto.multiEntryMaxPerDay === undefined
    ) {
      throw new BadRequestException(
        'Provide at least one settings field to update',
      );
    }
    await this.assertTenantExists(tenantId);
    const before = await this.getOrCreate(tenantId);

    const settings = await this.prisma.tenantSettings.update({
      where: { tenantId },
      data: {
        ...(dto.reservationCancellationHours !== undefined
          ? {
              reservationCancellationHours: dto.reservationCancellationHours,
            }
          : {}),
        ...(dto.waitlistMode !== undefined
          ? { waitlistMode: dto.waitlistMode }
          : {}),
        ...(dto.allowLateSessionEntry !== undefined
          ? { allowLateSessionEntry: dto.allowLateSessionEntry }
          : {}),
        ...(dto.debtToleranceDays !== undefined
          ? { debtToleranceDays: dto.debtToleranceDays }
          : {}),
        ...(dto.multiEntryEnabled !== undefined
          ? { multiEntryEnabled: dto.multiEntryEnabled }
          : {}),
        ...(dto.multiEntryMaxPerDay !== undefined
          ? { multiEntryMaxPerDay: dto.multiEntryMaxPerDay }
          : {}),
      },
    });
    const detail = this.toDetail(settings);
    await this.audit.record({
      tenantId,
      actor,
      action: AUDIT_ACTIONS.tenantSettingsUpdate,
      entityType: 'tenant_settings',
      entityId: tenantId,
      before: this.auditSnapshot(this.toDetail(before)),
      after: this.auditSnapshot(detail),
    });
    return detail;
  }

  /**
   * Horas de cancelación efectivas (default 6 si aún no hay row).
   */
  async getCancellationHours(tenantId: string): Promise<number> {
    const settings = await this.getOrCreate(tenantId);
    return settings.reservationCancellationHours;
  }

  /**
   * Modo de lista de espera efectivo (default AUTO_ASSIGN).
   */
  async getWaitlistMode(tenantId: string): Promise<WaitlistMode> {
    const settings = await this.getOrCreate(tenantId);
    return settings.waitlistMode;
  }

  /**
   * Si el gym permite reservar/crédito tras el inicio (hasta `endsAt`).
   */
  async getAllowLateSessionEntry(tenantId: string): Promise<boolean> {
    const settings = await this.getOrCreate(tenantId);
    return settings.allowLateSessionEntry;
  }

  /**
   * Valida que la sesión aún admite reserva/crédito (CU-RES-001 / CU-RES-006).
   *
   * @remarks Antes de `startsAt`: siempre OK. Entre `startsAt` y `endsAt`:
   * solo si `allowLateSessionEntry`. Después de `endsAt`: siempre error.
   * @throws {BadRequestException} Sesión terminada o iniciada sin ingreso tardío.
   */
  async assertSessionOpenForBooking(
    tenantId: string,
    session: { startsAt: Date; endsAt: Date },
  ): Promise<void> {
    const now = Date.now();
    if (session.endsAt.getTime() <= now) {
      throw new BadRequestException('Session has already ended');
    }
    if (session.startsAt.getTime() > now) {
      return;
    }
    const allowLate = await this.getAllowLateSessionEntry(tenantId);
    if (!allowLate) {
      throw new BadRequestException('Session has already started');
    }
  }

  /**
   * ¿La sesión aún admite booking (sin lanzar)? Usado en promoción waitlist.
   */
  async isSessionOpenForBooking(
    tenantId: string,
    session: { startsAt: Date; endsAt: Date },
  ): Promise<boolean> {
    try {
      await this.assertSessionOpenForBooking(tenantId, session);
      return true;
    } catch {
      return false;
    }
  }

  private async getOrCreate(tenantId: string) {
    const existing = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
    });
    if (existing) {
      return existing;
    }
    try {
      return await this.prisma.tenantSettings.create({
        data: {
          tenantId,
          reservationCancellationHours: DEFAULT_CANCELLATION_HOURS,
          waitlistMode: DEFAULT_WAITLIST_MODE,
          allowLateSessionEntry: DEFAULT_ALLOW_LATE_ENTRY,
          debtToleranceDays: DEFAULT_DEBT_TOLERANCE_DAYS,
          multiEntryEnabled: DEFAULT_MULTI_ENTRY_ENABLED,
          multiEntryMaxPerDay: DEFAULT_MULTI_ENTRY_MAX,
        },
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const raced = await this.prisma.tenantSettings.findUnique({
          where: { tenantId },
        });
        if (raced) {
          return raced;
        }
      }
      throw error;
    }
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

  private toDetail(row: {
    tenantId: string;
    reservationCancellationHours: number;
    waitlistMode: WaitlistMode;
    allowLateSessionEntry: boolean;
    debtToleranceDays: number;
    multiEntryEnabled: boolean;
    multiEntryMaxPerDay: number;
    createdAt: Date;
    updatedAt: Date;
  }): TenantSettingsDetail {
    return {
      tenantId: row.tenantId,
      reservationCancellationHours: row.reservationCancellationHours,
      waitlistMode: row.waitlistMode,
      allowLateSessionEntry: row.allowLateSessionEntry,
      debtToleranceDays: row.debtToleranceDays,
      multiEntryEnabled: row.multiEntryEnabled,
      multiEntryMaxPerDay: row.multiEntryMaxPerDay,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private auditSnapshot(detail: TenantSettingsDetail): Prisma.InputJsonValue {
    return {
      reservationCancellationHours: detail.reservationCancellationHours,
      waitlistMode: detail.waitlistMode,
      allowLateSessionEntry: detail.allowLateSessionEntry,
      debtToleranceDays: detail.debtToleranceDays,
      multiEntryEnabled: detail.multiEntryEnabled,
      multiEntryMaxPerDay: detail.multiEntryMaxPerDay,
    };
  }
}
