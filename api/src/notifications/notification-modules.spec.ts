import { NotificationEventCode } from '@prisma/client';
import { isNotificationEventAvailable, notificationModules } from './notification-modules';

describe('notification modules', () => {
  it('marks payment and refund notices as shared', () => {
    expect(notificationModules(NotificationEventCode.PAYMENT_APPROVED)).toEqual([
      'club',
      'ecommerce',
    ]);
    expect(notificationModules(NotificationEventCode.REFUND_EXECUTED)).toEqual([
      'club',
      'ecommerce',
    ]);
  });

  it('limits reservations and debits to Club', () => {
    expect(
      isNotificationEventAvailable(
        NotificationEventCode.RESERVATION_CONFIRMED,
        ['club'],
      ),
    ).toBe(true);
    expect(
      isNotificationEventAvailable(
        NotificationEventCode.DEBIT_CHARGE_FAILED,
        ['ecommerce'],
      ),
    ).toBe(false);
  });

  it('keeps Faciliter notifications outside tenant modules', () => {
    expect(
      isNotificationEventAvailable(
        NotificationEventCode.PLATFORM_PLAN_PAID,
        ['club', 'ecommerce'],
      ),
    ).toBe(false);
    expect(notificationModules(NotificationEventCode.PLATFORM_PLAN_PAID)).toEqual(
      [],
    );
  });
});
