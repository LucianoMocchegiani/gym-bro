-- Caja del día: movimientos por cobros CASH (CU-PAG-002 / RN-PAG-007).

CREATE TYPE "CashMovementKind" AS ENUM ('INCOME');
CREATE TYPE "CashMovementConcept" AS ENUM ('PACK_CONTRACT', 'DROP_IN');

CREATE TABLE "cash_movements" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "business_date" DATE NOT NULL,
    "payment_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "recorded_by_staff_id" UUID,
    "amount" INTEGER NOT NULL,
    "kind" "CashMovementKind" NOT NULL DEFAULT 'INCOME',
    "concept" "CashMovementConcept" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_movements_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cash_movements_payment_id_key" ON "cash_movements"("payment_id");
CREATE INDEX "cash_movements_tenant_id_business_date_idx" ON "cash_movements"("tenant_id", "business_date");
CREATE INDEX "cash_movements_member_id_idx" ON "cash_movements"("member_id");

ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_recorded_by_staff_id_fkey" FOREIGN KEY ("recorded_by_staff_id") REFERENCES "staff_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
