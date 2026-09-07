-- Débito automático MONTHLY (RN-PAG-013..016 / CU-PAG-008..010)
CREATE TYPE "DebitMandateStatus" AS ENUM ('ACTIVE', 'RETRYING', 'FAILED', 'CANCELLED');

CREATE TABLE "debit_mandates" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "pack_id" UUID NOT NULL,
    "enrolled_transaction_item_id" UUID,
    "mp_customer_id" TEXT NOT NULL,
    "mp_card_id" TEXT NOT NULL,
    "card_last_four" TEXT,
    "card_payment_method_id" TEXT,
    "status" "DebitMandateStatus" NOT NULL,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "last_charged_at" TIMESTAMPTZ,
    "next_charge_on" DATE NOT NULL,
    "enrolled_by_staff_id" UUID NOT NULL,
    "cancelled_at" TIMESTAMPTZ,
    "cancelled_by_staff_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "debit_mandates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "debit_mandates_enrolled_transaction_item_id_key" ON "debit_mandates"("enrolled_transaction_item_id");
CREATE INDEX "debit_mandates_tenant_id_status_next_charge_on_idx" ON "debit_mandates"("tenant_id", "status", "next_charge_on");
CREATE INDEX "debit_mandates_member_id_idx" ON "debit_mandates"("member_id");
CREATE UNIQUE INDEX "debit_mandates_one_open_per_member_uidx"
  ON "debit_mandates" ("tenant_id", "member_id")
  WHERE "status" IN ('ACTIVE', 'RETRYING', 'FAILED');

ALTER TABLE "debit_mandates"
  ADD CONSTRAINT "debit_mandates_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "debit_mandates"
  ADD CONSTRAINT "debit_mandates_member_id_fkey"
  FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "debit_mandates"
  ADD CONSTRAINT "debit_mandates_pack_id_fkey"
  FOREIGN KEY ("pack_id") REFERENCES "packs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "debit_mandates"
  ADD CONSTRAINT "debit_mandates_enrolled_transaction_item_id_fkey"
  FOREIGN KEY ("enrolled_transaction_item_id") REFERENCES "transaction_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "debit_mandates"
  ADD CONSTRAINT "debit_mandates_enrolled_by_staff_id_fkey"
  FOREIGN KEY ("enrolled_by_staff_id") REFERENCES "staff_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "debit_mandates"
  ADD CONSTRAINT "debit_mandates_cancelled_by_staff_id_fkey"
  FOREIGN KEY ("cancelled_by_staff_id") REFERENCES "staff_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
