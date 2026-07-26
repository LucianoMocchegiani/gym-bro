-- Arqueo de caja del día (CU-PAG-003 / RN-PAG-007).

CREATE TABLE "cash_reconciliations" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "business_date" DATE NOT NULL,
    "expected_amount" INTEGER NOT NULL,
    "declared_amount" INTEGER NOT NULL,
    "difference" INTEGER NOT NULL,
    "reconciled_by_staff_id" UUID,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_reconciliations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cash_reconciliations_tenant_id_business_date_key" ON "cash_reconciliations"("tenant_id", "business_date");
CREATE INDEX "cash_reconciliations_tenant_id_business_date_idx" ON "cash_reconciliations"("tenant_id", "business_date");

ALTER TABLE "cash_reconciliations" ADD CONSTRAINT "cash_reconciliations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cash_reconciliations" ADD CONSTRAINT "cash_reconciliations_reconciled_by_staff_id_fkey" FOREIGN KEY ("reconciled_by_staff_id") REFERENCES "staff_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
