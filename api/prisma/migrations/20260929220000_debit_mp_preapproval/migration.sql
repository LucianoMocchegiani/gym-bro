-- Débito afiliado: suscripción MP (preapproval) en lugar de tarjeta + job.

ALTER TYPE "DebitMandateStatus" ADD VALUE IF NOT EXISTS 'PENDING_CHECKOUT';

UPDATE "debit_mandates"
SET
  "status" = 'CANCELLED',
  "cancelled_at" = COALESCE("cancelled_at", CURRENT_TIMESTAMP),
  "last_error" = 'Migrado a suscripción Mercado Pago; re-generá el link en Caja'
WHERE "status" IN ('ACTIVE', 'RETRYING', 'FAILED');

ALTER TABLE "debit_mandates"
  ADD COLUMN IF NOT EXISTS "mp_preapproval_id" TEXT,
  ADD COLUMN IF NOT EXISTS "mp_preapproval_plan_id" TEXT,
  ADD COLUMN IF NOT EXISTS "init_point" TEXT;

DROP INDEX IF EXISTS "debit_mandates_one_open_per_member_uidx";

ALTER TABLE "debit_mandates"
  DROP COLUMN IF EXISTS "mp_customer_id",
  DROP COLUMN IF EXISTS "mp_card_id",
  DROP COLUMN IF EXISTS "card_last_four",
  DROP COLUMN IF EXISTS "card_payment_method_id";

ALTER TABLE "debit_mandates"
  ALTER COLUMN "next_charge_on" DROP NOT NULL;

CREATE UNIQUE INDEX "debit_mandates_mp_preapproval_id_key"
  ON "debit_mandates"("mp_preapproval_id");

CREATE UNIQUE INDEX "debit_mandates_one_open_per_member_uidx"
  ON "debit_mandates" ("tenant_id", "member_id")
  WHERE "status" IN ('PENDING_CHECKOUT', 'ACTIVE', 'RETRYING', 'FAILED');
