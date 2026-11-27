import { NotificationEventCode } from '@prisma/client';

const SHARED_MODULES = ['club', 'ecommerce'];
const CLUB_MODULE = ['club'];
const NO_TENANT_MODULE = [];

export const NOTIFICATION_EVENT_MODULES: Record<NotificationEventCode, string[]> = {
  PAYMENT_APPROVED: SHARED_MODULES,
  RESERVATION_CONFIRMED: CLUB_MODULE,
  RESERVATION_CANCELLED: CLUB_MODULE,
  WAITLIST_PROMOTED: CLUB_MODULE,
  REFUND_EXECUTED: SHARED_MODULES,
  CONTRACT_EXPIRING: CLUB_MODULE,
  CONTRACT_EXPIRING_DEBIT: CLUB_MODULE,
  CONTRACT_IN_TOLERANCE: CLUB_MODULE,
  DEBIT_CHARGE_FAILED: CLUB_MODULE,
  DEBIT_MANDATE_FAILED: CLUB_MODULE,
  PLATFORM_PLAN_PAID: NO_TENANT_MODULE,
  PLATFORM_PLAN_EXPIRING: NO_TENANT_MODULE,
  PLATFORM_PLAN_EXPIRING_DEBIT: NO_TENANT_MODULE,
  PLATFORM_PLAN_IN_TOLERANCE: NO_TENANT_MODULE,
  PLATFORM_DEBIT_CHARGE_FAILED: NO_TENANT_MODULE,
  PLATFORM_DEBIT_MANDATE_FAILED: NO_TENANT_MODULE,
};

export function notificationModules(event: NotificationEventCode): string[] {
  return NOTIFICATION_EVENT_MODULES[event];
}

export function isNotificationEventAvailable(
  event: NotificationEventCode,
  tenantModules: string[],
): boolean {
  return notificationModules(event).some((module) => tenantModules.includes(module));
}
