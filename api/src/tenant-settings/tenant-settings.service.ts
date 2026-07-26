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

/**
 * Configuración operativa del gym (RN-TEN-005 / RN-TEN-006).
 *
 * @remarks Horas de cancelación + modo lista de espera.
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
      dto.waitlistMode === undefined
    ) {
      throw new BadRequestException(
        'Provide reservationCancellationHours and/or waitlistMode',
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
    createdAt: Date;
    updatedAt: Date;
  }): TenantSettingsDetail {
    return {
      tenantId: row.tenantId,
      reservationCancellationHours: row.reservationCancellationHours,
      waitlistMode: row.waitlistMode,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private auditSnapshot(detail: TenantSettingsDetail): Prisma.InputJsonValue {
    return {
      reservationCancellationHours: detail.reservationCancellationHours,
      waitlistMode: detail.waitlistMode,
    };
  }
}
