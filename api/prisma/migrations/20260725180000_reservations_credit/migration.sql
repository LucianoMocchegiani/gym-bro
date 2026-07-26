-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReservationCoverage" AS ENUM ('CREDIT');

-- CreateTable
CREATE TABLE "reservations" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "contract_id" UUID NOT NULL,
    "credit_balance_id" UUID NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'CONFIRMED',
    "coverage" "ReservationCoverage" NOT NULL DEFAULT 'CREDIT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reservations_tenant_id_idx" ON "reservations"("tenant_id");

-- CreateIndex
CREATE INDEX "reservations_member_id_idx" ON "reservations"("member_id");

-- CreateIndex
CREATE INDEX "reservations_session_id_idx" ON "reservations"("session_id");

-- CreateIndex
CREATE INDEX "reservations_contract_id_idx" ON "reservations"("contract_id");

-- CreateIndex
CREATE INDEX "reservations_credit_balance_id_idx" ON "reservations"("credit_balance_id");

-- CreateIndex
-- Un afiliado no puede tener dos reservas CONFIRMED en la misma sesión.
CREATE UNIQUE INDEX "reservations_session_member_confirmed_uidx"
  ON "reservations"("session_id", "member_id")
  WHERE "status" = 'CONFIRMED';

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_credit_balance_id_fkey" FOREIGN KEY ("credit_balance_id") REFERENCES "contract_credit_balances"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
