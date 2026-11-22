import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AccessProvider, Prisma, WaitlistMode } from '@prisma/client';
import { AUDIT_ACTIONS, AuditActor } from '../audit/audit.types';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { bpsToPercent, percentToBps } from '../payment/cash-discount';
import { UpdateTenantSettingsDto } from './dto/tenant-settings.dto';
import { TenantSettingsDetail } from './tenant-settings.types';

const DEFAULT_CANCELLATION_HOURS = 6;
const DEFAULT_WAITLIST_MODE = WaitlistMode.AUTO_ASSIGN;
const DEFAULT_ALLOW_LATE_ENTRY = false;
const DEFAULT_DEBT_TOLERANCE_DAYS = 15;
const DEFAULT_MULTI_ENTRY_ENABLED = false;
const DEFAULT_MULTI_ENTRY_MAX = 1;

type MpDiscountDefaults = { qrBps: number; mpLinkBps: number };

/** Configuración operativa del gym. */
@Injectable()
export class TenantSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async get(tenantId: string): Promise<TenantSettingsDetail> {
    await this.assertTenantExists(tenantId);
    const settings = await this.getOrCreate(tenantId);
    return this.toDetail(settings, await this.getMpDiscountDefaults(tenantId));
  }

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
      dto.multiEntryMaxPerDay === undefined &&
      dto.accessProvider === undefined &&
      dto.cashDiscountPercent === undefined &&
      dto.transferDiscountPercent === undefined &&
      dto.qrPointDiscountPercent === undefined &&
      dto.mpLinkDiscountPercent === undefined
    ) {
      throw new BadRequestException(
        'Provide at least one settings field to update',
      );
    }
    await this.assertTenantExists(tenantId);
    const before = await this.getOrCreate(tenantId);
    const beforeMpDiscounts = await this.getMpDiscountDefaults(tenantId);

    await this.prisma.tenantSettings.update({
      where: { tenantId },
      data: {
        ...(dto.reservationCancellationHours !== undefined
          ? { reservationCancellationHours: dto.reservationCancellationHours }
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
        ...(dto.accessProvider !== undefined
          ? { accessProvider: dto.accessProvider }
          : {}),
        ...(dto.cashDiscountPercent !== undefined
          ? { cashDiscountBps: percentToBps(dto.cashDiscountPercent) }
          : {}),
        ...(dto.transferDiscountPercent !== undefined
          ? { transferDiscountBps: percentToBps(dto.transferDiscountPercent) }
          : {}),
      },
    });
    if (
      dto.qrPointDiscountPercent !== undefined ||
      dto.mpLinkDiscountPercent !== undefined
    ) {
      await this.prisma.$executeRaw`
        UPDATE "tenant_settings"
        SET "mp_point_qr_discount_bps" = COALESCE(
              ${dto.qrPointDiscountPercent === undefined ? null : percentToBps(dto.qrPointDiscountPercent)},
              "mp_point_qr_discount_bps"
            ),
            "mp_link_discount_bps" = COALESCE(
              ${dto.mpLinkDiscountPercent === undefined ? null : percentToBps(dto.mpLinkDiscountPercent)},
              "mp_link_discount_bps"
            )
        WHERE "tenant_id" = ${tenantId}::uuid
      `;
    }
    const updated = await this.getOrCreate(tenantId);
    const detail = this.toDetail(
      updated,
      await this.getMpDiscountDefaults(tenantId),
    );
    await this.audit.record({
      tenantId,
      actor,
      action: AUDIT_ACTIONS.tenantSettingsUpdate,
      entityType: 'tenant_settings',
      entityId: tenantId,
      before: this.auditSnapshot(this.toDetail(before, beforeMpDiscounts)),
      after: this.auditSnapshot(detail),
    });
    return detail;
  }

  async getCancellationHours(tenantId: string): Promise<number> {
    const settings = await this.getOrCreate(tenantId);
    return settings.reservationCancellationHours;
  }

  async getWaitlistMode(tenantId: string): Promise<WaitlistMode> {
    const settings = await this.getOrCreate(tenantId);
    return settings.waitlistMode;
  }

  async getAccessProvider(tenantId: string): Promise<AccessProvider> {
    const settings = await this.getOrCreate(tenantId);
    return settings.accessProvider;
  }

  async getCashDiscountDefaults(tenantId: string): Promise<{
    cashBps: number;
    transferBps: number;
    qrPointBps: number;
    mpLinkBps: number;
  }> {
    const [settings, mpDiscounts] = await Promise.all([
      this.getOrCreate(tenantId),
      this.getMpDiscountDefaults(tenantId),
    ]);
    return {
      cashBps: settings.cashDiscountBps,
      transferBps: settings.transferDiscountBps,
      qrPointBps: mpDiscounts.qrBps,
      mpLinkBps: mpDiscounts.mpLinkBps,
    };
  }

  async getAllowLateSessionEntry(tenantId: string): Promise<boolean> {
    const settings = await this.getOrCreate(tenantId);
    return settings.allowLateSessionEntry;
  }

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
    if (!(await this.getAllowLateSessionEntry(tenantId))) {
      throw new BadRequestException('Session has already started');
    }
  }

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

  private async getMpDiscountDefaults(tenantId: string): Promise<MpDiscountDefaults> {
    const [row] = await this.prisma.$queryRaw<MpDiscountDefaults[]>`
      SELECT "mp_point_qr_discount_bps" AS "qrBps",
             "mp_link_discount_bps" AS "mpLinkBps"
      FROM "tenant_settings"
      WHERE "tenant_id" = ${tenantId}::uuid
    `;
    return row;
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

  private toDetail(
    row: {
      tenantId: string;
      reservationCancellationHours: number;
      waitlistMode: WaitlistMode;
      allowLateSessionEntry: boolean;
      debtToleranceDays: number;
      multiEntryEnabled: boolean;
      multiEntryMaxPerDay: number;
      accessProvider: AccessProvider;
      cashDiscountBps: number;
      transferDiscountBps: number;
      createdAt: Date;
      updatedAt: Date;
    },
    mpDiscounts: MpDiscountDefaults,
  ): TenantSettingsDetail {
    return {
      tenantId: row.tenantId,
      reservationCancellationHours: row.reservationCancellationHours,
      waitlistMode: row.waitlistMode,
      allowLateSessionEntry: row.allowLateSessionEntry,
      debtToleranceDays: row.debtToleranceDays,
      multiEntryEnabled: row.multiEntryEnabled,
      multiEntryMaxPerDay: row.multiEntryMaxPerDay,
      accessProvider: row.accessProvider,
      cashDiscountPercent: bpsToPercent(row.cashDiscountBps),
      transferDiscountPercent: bpsToPercent(row.transferDiscountBps),
      qrPointDiscountPercent: bpsToPercent(mpDiscounts.qrBps),
      mpLinkDiscountPercent: bpsToPercent(mpDiscounts.mpLinkBps),
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
      accessProvider: detail.accessProvider,
      cashDiscountPercent: detail.cashDiscountPercent,
      transferDiscountPercent: detail.transferDiscountPercent,
      qrPointDiscountPercent: detail.qrPointDiscountPercent,
      mpLinkDiscountPercent: detail.mpLinkDiscountPercent,
    };
  }
}
