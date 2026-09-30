import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { NotificationEventCode, TenantStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationDispatcher } from '../notifications/notifications.service';
import { ExpirationsService } from './expirations.service';

/**
 * Avisos E2/E3 una vez al día (timezone gym: America/Argentina).
 */
@Injectable()
export class ExpirationNotifyJob {
  private readonly logger = new Logger(ExpirationNotifyJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly expirations: ExpirationsService,
    private readonly notifications: NotificationDispatcher,
  ) {}

  @Cron('0 12 * * *', { timeZone: 'America/Argentina/Buenos_Aires' })
  async runDaily(): Promise<void> {
    const tenants = await this.prisma.tenant.findMany({
      where: { status: TenantStatus.ACTIVE },
      select: { id: true },
    });
    for (const t of tenants) {
      try {
        await this.notifyTenant(t.id);
        await this.notifyPlatformPlan(t.id);
      } catch (err) {
        this.logger.warn(
          `expiration notify tenant=${t.id}: ${err instanceof Error ? err.message : err}`,
        );
      }
    }
  }

  private async notifyTenant(tenantId: string): Promise<void> {
    const rows = await this.expirations.listNotifyRows(tenantId);
    for (const r of rows) {
      if (r.bucket === 'upcoming') {
        const event =
          r.payKind === 'manual'
            ? NotificationEventCode.CONTRACT_EXPIRING
            : NotificationEventCode.CONTRACT_EXPIRING_DEBIT;
        await this.notifications.notifyMember({
          tenantId,
          memberId: r.memberId,
          event,
          idempotencyKey: `${event}:${r.contractId}`,
          extraVars: {
            pack: r.packName,
            vence: r.endsOn,
            dias: String(r.daysUntil),
          },
          payload: {
            contractId: r.contractId,
            bucket: r.bucket,
            payKind: r.payKind,
          },
        });
      } else {
        await this.notifications.notifyMember({
          tenantId,
          memberId: r.memberId,
          event: NotificationEventCode.CONTRACT_IN_TOLERANCE,
          idempotencyKey: `CONTRACT_IN_TOLERANCE:${r.contractId}`,
          extraVars: {
            pack: r.packName,
            vence: r.endsOn,
          },
          payload: { contractId: r.contractId, bucket: r.bucket },
        });
      }
    }
  }

  private async notifyPlatformPlan(tenantId: string): Promise<void> {
    const rows = await this.expirations.listNotifyPlatformRows(tenantId);
    for (const r of rows) {
      if (r.bucket === 'upcoming') {
        const event = r.debit
          ? NotificationEventCode.PLATFORM_PLAN_EXPIRING_DEBIT
          : NotificationEventCode.PLATFORM_PLAN_EXPIRING;
        await this.notifications.notifyPlatformOwner({
          tenantId,
          identityId: r.identityId,
          event,
          idempotencyKey: `${event}:${r.contractId}`,
          extraVars: {
            pack: r.packName,
            vence: r.endsOn,
            dias: String(r.daysUntil),
          },
          payload: { contractId: r.contractId, bucket: r.bucket },
        });
      } else {
        await this.notifications.notifyPlatformOwner({
          tenantId,
          identityId: r.identityId,
          event: NotificationEventCode.PLATFORM_PLAN_IN_TOLERANCE,
          idempotencyKey: `PLATFORM_PLAN_IN_TOLERANCE:${r.contractId}`,
          extraVars: {
            pack: r.packName,
            vence: r.endsOn,
          },
          payload: { contractId: r.contractId, bucket: r.bucket },
        });
      }
    }
  }
}
