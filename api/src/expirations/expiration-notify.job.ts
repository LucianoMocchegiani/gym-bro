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
        await this.notifications.notifyMember({
          tenantId,
          memberId: r.memberId,
          event: NotificationEventCode.CONTRACT_EXPIRING,
          idempotencyKey: `CONTRACT_EXPIRING:${r.contractId}`,
          extraVars: {
            pack: r.packName,
            vence: r.endsOn,
            dias: String(r.daysUntil),
          },
          payload: { contractId: r.contractId, bucket: r.bucket },
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
}
