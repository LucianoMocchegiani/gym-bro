import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  NotificationEmailStatus,
  NotificationEventCode,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CABLED_NOTIFICATION_EVENTS,
  defaultTemplate,
  formatAmountArs,
  notificationEventLabel,
  renderTemplate,
  templatePlaceholders,
} from './notification.defaults';
import { MAIL_PORT } from './mail.port';
import type { MailPort } from './mail.port';
import type {
  NotificationDetail,
  NotificationPreferenceDetail,
  NotificationTemplateDetail,
} from './notifications.types';

export type NotifyMemberInput = {
  tenantId: string;
  memberId: string;
  event: NotificationEventCode;
  idempotencyKey: string;
  extraVars?: Record<string, string>;
  payload?: Prisma.InputJsonValue;
};

/**
 * Fachada N1: in-app + email. No lanza al caller de negocio (CU-NOT-001).
 */
@Injectable()
export class NotificationDispatcher {
  private readonly logger = new Logger(NotificationDispatcher.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(MAIL_PORT) private readonly mail: MailPort,
  ) {}

  async notifyPaymentApproved(
    tenantId: string,
    transactionId: string,
  ): Promise<void> {
    const tx = await this.prisma.transaction.findFirst({
      where: { id: transactionId, tenantId },
      select: { memberId: true, amount: true },
    });
    if (!tx?.memberId) {
      return;
    }
    await this.notifyMember({
      tenantId,
      memberId: tx.memberId,
      event: NotificationEventCode.PAYMENT_APPROVED,
      idempotencyKey: `PAYMENT_APPROVED:${transactionId}`,
      extraVars: { monto: formatAmountArs(tx.amount) },
      payload: { transactionId },
    });
  }

  /**
   * Inserta in-app y opcionalmente email. Idempotente por `idempotencyKey`.
   */
  async notifyMember(input: NotifyMemberInput): Promise<void> {
    try {
      await this.dispatch(input);
    } catch (err) {
      this.logger.warn(
        `notify ${input.event} failed: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  private async dispatch(input: NotifyMemberInput): Promise<void> {
    const member = await this.prisma.member.findFirst({
      where: { id: input.memberId, tenantId: input.tenantId },
      select: {
        email: true,
        name: true,
        tenant: { select: { name: true } },
      },
    });
    if (!member) {
      return;
    }

    const templateRow = await this.prisma.notificationTemplate.findUnique({
      where: {
        tenantId_eventCode: {
          tenantId: input.tenantId,
          eventCode: input.event,
        },
      },
    });
    if (templateRow && !templateRow.active) {
      return;
    }
    const subjectTpl =
      templateRow?.subject ?? defaultTemplate(input.event).subject;
    const bodyTpl = templateRow?.body ?? defaultTemplate(input.event).body;

    const pref = await this.prisma.notificationPreference.findUnique({
      where: {
        tenantId_memberId_eventCode: {
          tenantId: input.tenantId,
          memberId: input.memberId,
          eventCode: input.event,
        },
      },
    });
    const emailOn = pref?.emailEnabled ?? true;

    const vars: Record<string, string> = {
      gym: member.tenant.name,
      nombre: member.name?.trim() || member.email,
      ...input.extraVars,
    };
    const title = renderTemplate(subjectTpl, vars);
    const body = renderTemplate(bodyTpl, vars);

    let emailStatus: NotificationEmailStatus = NotificationEmailStatus.SKIPPED;

    try {
      await this.prisma.notification.create({
        data: {
          tenantId: input.tenantId,
          memberId: input.memberId,
          eventCode: input.event,
          title,
          body,
          payload: input.payload,
          inAppRead: false,
          emailStatus: NotificationEmailStatus.SKIPPED,
          idempotencyKey: input.idempotencyKey,
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

    const to = member.email.trim();
    if (!to) {
      return;
    }

    try {
      await this.mail.send({ to, subject: title, text: body });
      emailStatus = NotificationEmailStatus.SENT;
    } catch (err) {
      this.logger.warn(
        `email failed ${input.idempotencyKey}: ${err instanceof Error ? err.message : err}`,
      );
      emailStatus = NotificationEmailStatus.FAILED;
    }

    await this.prisma.notification.update({
      where: {
        tenantId_idempotencyKey: {
          tenantId: input.tenantId,
          idempotencyKey: input.idempotencyKey,
        },
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

  async listEmailPreferences(
    tenantId: string,
    memberId: string,
  ): Promise<NotificationPreferenceDetail[]> {
    const rows = await this.prisma.notificationPreference.findMany({
      where: { tenantId, memberId },
    });
    const byEvent = new Map(rows.map((r) => [r.eventCode, r.emailEnabled]));
    return CABLED_NOTIFICATION_EVENTS.map((eventCode) => ({
      eventCode,
      emailEnabled: byEvent.get(eventCode) ?? true,
    }));
  }

  async setEmailPreference(
    tenantId: string,
    memberId: string,
    eventCode: NotificationEventCode,
    emailEnabled: boolean,
  ): Promise<NotificationPreferenceDetail> {
    if (!CABLED_NOTIFICATION_EVENTS.includes(eventCode)) {
      throw new NotFoundException('Unknown notification event');
    }
    await this.prisma.notificationPreference.upsert({
      where: {
        tenantId_memberId_eventCode: {
          tenantId,
          memberId,
          eventCode,
        },
      },
      create: {
        tenantId,
        memberId,
        eventCode,
        emailEnabled,
      },
      update: { emailEnabled },
    });
    return { eventCode, emailEnabled };
  }

  /**
   * Lista eventos cableados con default o fila del tenant (RN-NOT-003 / RN-NOT-007).
   */
  async listTemplates(tenantId: string): Promise<NotificationTemplateDetail[]> {
    const rows = await this.prisma.notificationTemplate.findMany({
      where: { tenantId },
    });
    const byEvent = new Map(rows.map((r) => [r.eventCode, r]));
    return CABLED_NOTIFICATION_EVENTS.map((eventCode) =>
      this.toTemplateDetail(eventCode, byEvent.get(eventCode) ?? null),
    );
  }

  /**
   * Upsert de asunto/cuerpo y activo. Evento no cableado → 404.
   */
  async upsertTemplate(
    tenantId: string,
    eventCode: NotificationEventCode,
    input: { subject: string; body: string; active: boolean },
  ): Promise<NotificationTemplateDetail> {
    this.assertCabled(eventCode);
    const row = await this.prisma.notificationTemplate.upsert({
      where: {
        tenantId_eventCode: { tenantId, eventCode },
      },
      create: {
        tenantId,
        eventCode,
        subject: input.subject,
        body: input.body,
        active: input.active,
      },
      update: {
        subject: input.subject,
        body: input.body,
        active: input.active,
      },
    });
    return this.toTemplateDetail(eventCode, row);
  }

  private assertCabled(eventCode: NotificationEventCode): void {
    if (!CABLED_NOTIFICATION_EVENTS.includes(eventCode)) {
      throw new NotFoundException('Unknown notification event');
    }
  }

  private toTemplateDetail(
    eventCode: NotificationEventCode,
    row: {
      subject: string;
      body: string;
      active: boolean;
    } | null,
  ): NotificationTemplateDetail {
    const fallback = defaultTemplate(eventCode);
    return {
      eventCode,
      label: notificationEventLabel(eventCode),
      subject: row?.subject ?? fallback.subject,
      body: row?.body ?? fallback.body,
      active: row?.active ?? true,
      customized: row !== null,
      placeholders: templatePlaceholders(eventCode),
    };
  }
}
