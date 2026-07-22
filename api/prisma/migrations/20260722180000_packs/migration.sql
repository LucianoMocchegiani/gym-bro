-- Packs + componentes (CU-SER-002).
CREATE TYPE "BillingPeriod" AS ENUM ('MONTHLY', 'ONE_TIME');

CREATE TABLE "packs" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" INTEGER NOT NULL,
    "billing_period" "BillingPeriod" NOT NULL,
    "credits_expire_at" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "packs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pack_components" (
    "id" UUID NOT NULL,
    "pack_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "credit_amount" INTEGER,

    CONSTRAINT "pack_components_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "packs_tenant_id_idx" ON "packs"("tenant_id");

CREATE UNIQUE INDEX "pack_components_pack_id_service_id_key" ON "pack_components"("pack_id", "service_id");

CREATE INDEX "pack_components_service_id_idx" ON "pack_components"("service_id");

ALTER TABLE "packs" ADD CONSTRAINT "packs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "pack_components" ADD CONSTRAINT "pack_components_pack_id_fkey" FOREIGN KEY ("pack_id") REFERENCES "packs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "pack_components" ADD CONSTRAINT "pack_components_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
