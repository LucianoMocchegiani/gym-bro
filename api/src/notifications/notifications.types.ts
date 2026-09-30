import { NotificationEventCode } from '@prisma/client';

export interface NotificationDetail {
  id: string;
  eventCode: NotificationEventCode;
  title: string;
  body: string;
  inAppRead: boolean;
  createdAt: string;
}

export interface NotificationPreferenceDetail {
  eventCode: NotificationEventCode;
  emailEnabled: boolean;
}

/**
 * Plantilla del gym (CU-NOT-002). Sin fila en DB = defaults + `customized: false`.
 */
export interface NotificationTemplateDetail {
  eventCode: NotificationEventCode;
  label: string;
  subject: string;
  body: string;
  active: boolean;
  customized: boolean;
  placeholders: string[];
}
