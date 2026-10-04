-- Venta de plataforma: la transacción queda en `admin` y apunta al gym facturado.
ALTER TABLE "transactions" ADD COLUMN "billed_tenant_id" UUID;

CREATE INDEX "transactions_billed_tenant_id_idx" ON "transactions"("billed_tenant_id");

ALTER TABLE "transactions" ADD CONSTRAINT "transactions_billed_tenant_id_fkey" FOREIGN KEY ("billed_tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
