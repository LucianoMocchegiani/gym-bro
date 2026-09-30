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
