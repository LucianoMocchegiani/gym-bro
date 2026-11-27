-- Add module classification without removing or altering existing notifications.
ALTER TABLE "notifications"
  ADD COLUMN "modules" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "notifications"
SET "modules" = CASE
  WHEN "event_code" IN ('PAYMENT_APPROVED', 'REFUND_EXECUTED')
    THEN ARRAY['club', 'ecommerce']::TEXT[]
  WHEN "event_code" IN (
    'RESERVATION_CONFIRMED',
    'RESERVATION_CANCELLED',
    'WAITLIST_PROMOTED',
    'CONTRACT_EXPIRING',
    'CONTRACT_EXPIRING_DEBIT',
    'CONTRACT_IN_TOLERANCE',
    'DEBIT_CHARGE_FAILED',
    'DEBIT_MANDATE_FAILED'
  )
    THEN ARRAY['club']::TEXT[]
  ELSE ARRAY[]::TEXT[]
END;
