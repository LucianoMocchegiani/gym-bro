-- Checkout MP: método MP + ids de Preference/pago para webhook idempotente.

ALTER TYPE "PaymentMethod" ADD VALUE 'MP';

ALTER TABLE "payments" ADD COLUMN "mp_preference_id" TEXT,
ADD COLUMN "mp_payment_id" TEXT,
ADD COLUMN "mp_init_point" TEXT,
ADD COLUMN "mp_sandbox_init_point" TEXT;

CREATE UNIQUE INDEX "payments_mp_payment_id_key" ON "payments"("mp_payment_id");
CREATE INDEX "payments_mp_preference_id_idx" ON "payments"("mp_preference_id");
