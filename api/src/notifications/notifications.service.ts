import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  NotificationEmailStatus,
  NotificationEventCode,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  defaultTemplate,
  formatAmountArs,
  renderTemplate,
} from './notification.defaults';
import { MAIL_PORT } from './mail.port';
import type { MailPort } from './mail.port';
import type {
  NotificationDetail,
  NotificationPreferenceDetail,
} from './notifications.types';

/**
 * Fachada N1: in-app + email. No lanza hacia pagos (CU-NOT-001).
 *
 * @remarks Idempotencia `PAYMENT_APPROVED:{transactionId}`. RN-NOT-003/005.
 */
@Injectable()
export class NotificationDispatcher {
  private readonly logger = new Logger(NotificationDispatcher.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(MAIL_PORT) private readonly mail: MailPort,
  ) {}

  /**
   * Aviso de cobro acreditado (caja o MP).
   */
  async notifyPaymentApproved(
    tenantId: string,
    transactionId: string,
  ): Promise<void> {
    try {
      await this.dispatchPaymentApproved(tenantId, transactionId);
    } catch (err) {
      this.logger.warn(
        `notifyPaymentApproved failed tx=${transactionId}: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  private async dispatchPaymentApproved(
    tenantId: string,
    transactionId: string,
  ): Promise<void> {
    const tx = await this.prisma.transaction.findFirst({
      where: { id: transactionId, tenantId },
      include: {
        member: { select: { id: true, email: true, name: true } },
        tenant: { select: { name: true } },
      },
    });
    if (!tx?.memberId || !tx.member) {
      return;
    }

    const event = NotificationEventCode.PAYMENT_APPROVED;
    const templateRow = await this.prisma.notificationTemplate.findUnique({
      where: {
        tenantId_eventCode: { tenantId, eventCode: event },
      },
    });
    if (templateRow && !templateRow.active) {
      return;
    }
    const subjectTpl =
      templateRow?.subject ?? defaultTemplate(event).subject;
    const bodyTpl = templateRow?.body ?? defaultTemplate(event).body;

    const pref = await this.prisma.notificationPreference.findUnique({
      where: {
        tenantId_memberId_eventCode: {
          tenantId,
          memberId: tx.memberId,
          eventCode: event,
        },
      },
    });
    const emailOn = pref?.emailEnabled ?? true;

    const gym = tx.tenant.name;
    const nombre = tx.member.name?.trim() || tx.member.email;
    const monto = formatAmountArs(tx.amount);
    const vars = { gym, nombre, monto };
    const title = renderTemplate(subjectTpl, vars);
    const body = renderTemplate(bodyTpl, vars);
    const idempotencyKey = `PAYMENT_APPROVED:${transactionId}`;

    let emailStatus: NotificationEmailStatus = emailOn
      ? NotificationEmailStatus.SKIPPED
      : NotificationEmailStatus.SKIPPED;

    try {
      await this.prisma.notification.create({
        data: {
          tenantId,
          memberId: tx.memberId,
          eventCode: event,
          title,
          body,
          payload: { transactionId } as Prisma.InputJsonValue,
          inAppRead: false,
          emailStatus: NotificationEmailStatus.SKIPPED,
          idempotencyKey,
        },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        return;
      }
      throw err;
    }

    if (!emailOn) {
      return;
    }

    const to = tx.member.email.trim();
    if (!to) {
      await this.prisma.notification.update({
        where: {
          tenantId_idempotencyKey: { tenantId, idempotencyKey },
        },
        data: { emailStatus: NotificationEmailStatus.SKIPPED },
      });
      return;
    }

    try {
      await this.mail.send({ to, subject: title, text: body });
      emailStatus = NotificationEmailStatus.SENT;
    } catch (err) {
      this.logger.warn(
        `email failed ${idempotencyKey}: ${err instanceof Error ? err.message : err}`,
      );
      emailStatus = NotificationEmailStatus.FAILED;
    }

    await this.prisma.notification.update({
      where: {
        tenantId_idempotencyKey: { tenantId, idempotencyKey },
      },
      data: { emailStatus },
    });
  }
}

/**
 * Bandeja y preferencias del socio (CU-NOT-003 / CU-NOT-005).
 */
@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async listMine(
    tenantId: string,
    memberId: string,
  ): Promise<NotificationDetail[]> {
    const rows = await this.prisma.notification.findMany({
      where: { tenantId, memberId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return rows.map((r) => ({
      id: r.id,
      eventCode: r.eventCode,
      title: r.title,
      body: r.body,
      inAppRead: r.inAppRead,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async markRead(
    tenantId: string,
    memberId: string,
    notificationId: string,
  ): Promise<NotificationDetail> {
    const row = await this.prisma.notification.findFirst({
      where: { id: notificationId, tenantId, memberId },
    });
    if (!row) {
      throw new NotFoundException('Notification not found');
    }
    const updated = await this.prisma.notification.update({
      where: { id: row.id },
      data: { inAppRead: true },
    });
    return {
      id: updated.id,
      eventCode: updated.eventCode,
      title: updated.title,
      body: updated.body,
      inAppRead: updated.inAppRead,
      createdAt: updated.createdAt.toISOString(),
    };
  }

  async getEmailPreference(
    tenantId: string,
    memberId: string,
  ): Promise<NotificationPreferenceDetail> {
    const event = NotificationEventCode.PAYMENT_APPROVED;
    const row = await this.prisma.notificationPreference.findUnique({
      where: {
        tenantId_memberId_eventCode: {
          tenantId,
          memberId,
          eventCode: event,
        },
      },
    });
    return {
      eventCode: event,
      emailEnabled: row?.emailEnabled ?? true,
    };
  }

  async setEmailPreference(
    tenantId: string,
    memberId: string,
    emailEnabled: boolean,
  ): Promise<NotificationPreferenceDetail> {
    const event = NotificationEventCode.PAYMENT_APPROVED;
    await this.prisma.notificationPreference.upsert({
      where: {
        tenantId_memberId_eventCode: {
          tenantId,
          memberId,
          eventCode: event,
        },
      },
      create: {
        tenantId,
        memberId,
        eventCode: event,
        emailEnabled,
      },
      update: { emailEnabled },
    });
    return { eventCode: event, emailEnabled };
  }
}
