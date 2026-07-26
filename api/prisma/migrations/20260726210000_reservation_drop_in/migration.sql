-- Drop-in: precio en servicio + cobertura DROP_IN en reservas (CU-RES-001 / RN-RES-001).

ALTER TYPE "ReservationCoverage" ADD VALUE IF NOT EXISTS 'DROP_IN';

ALTER TABLE "services"
  ADD COLUMN "drop_in_price" INTEGER;

ALTER TABLE "reservations"
  ALTER COLUMN "contract_id" DROP NOT NULL,
  ALTER COLUMN "credit_balance_id" DROP NOT NULL,
  ADD COLUMN "payment_id" UUID;

CREATE UNIQUE INDEX "reservations_payment_id_key" ON "reservations"("payment_id");

ALTER TABLE "reservations"
  ADD CONSTRAINT "reservations_payment_id_fkey"
  FOREIGN KEY ("payment_id") REFERENCES "payments"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
