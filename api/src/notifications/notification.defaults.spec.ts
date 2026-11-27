import { NotificationEventCode } from '@prisma/client';
import { notificationEventsForModules, notificationModulesForEvent } from './notification.defaults';

describe('notification module classification', () => {
  it('shares payment and refund notices with E-commerce while keeping Club events scoped', () => {
    expect(notificationEventsForModules(['ecommerce'])).toEqual([
      NotificationEventCode.PAYMENT_APPROVED,
      NotificationEventCode.REFUND_EXECUTED,
    ]);
    expect(notificationEventsForModules(['club'])).toHaveLength(10);
    expect(notificationModulesForEvent(NotificationEventCode.PLATFORM_PLAN_PAID)).toEqual([]);
  });
});
