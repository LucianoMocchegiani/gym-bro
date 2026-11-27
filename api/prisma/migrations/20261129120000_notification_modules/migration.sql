-- Persist the module classification for generated notices. Platform notices stay unscoped.
ALTER TABLE "notifications"
ADD COLUMN "modules" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "notifications"
SET "modules" = CASE "event_code"::TEXT
  WHEN 'PAYMENT_APPROVED' THEN ARRAY['club', 'ecommerce']::TEXT[]
  WHEN 'REFUND_EXECUTED' THEN ARRAY['club', 'ecommerce']::TEXT[]
  WHEN 'RESERVATION_CONFIRMED' THEN ARRAY['club']::TEXT[]
  WHEN 'RESERVATION_CANCELLED' THEN ARRAY['club']::TEXT[]
  WHEN 'WAITLIST_PROMOTED' THEN ARRAY['club']::TEXT[]
  WHEN 'CONTRACT_EXPIRING' THEN ARRAY['club']::TEXT[]
  WHEN 'CONTRACT_EXPIRING_DEBIT' THEN ARRAY['club']::TEXT[]
  WHEN 'CONTRACT_IN_TOLERANCE' THEN ARRAY['club']::TEXT[]
  WHEN 'DEBIT_CHARGE_FAILED' THEN ARRAY['club']::TEXT[]
  WHEN 'DEBIT_MANDATE_FAILED' THEN ARRAY['club']::TEXT[]
  ELSE ARRAY[]::TEXT[]
END;
