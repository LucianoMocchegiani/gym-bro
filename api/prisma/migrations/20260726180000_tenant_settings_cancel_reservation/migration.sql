-- CreateTable
CREATE TABLE "tenant_settings" (
    "tenant_id" UUID NOT NULL,
    "reservation_cancellation_hours" INTEGER NOT NULL DEFAULT 6,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_settings_pkey" PRIMARY KEY ("tenant_id")
);

-- Backfill existing tenants with default cancellation window (6h).
INSERT INTO "tenant_settings" ("tenant_id", "reservation_cancellation_hours", "created_at", "updated_at")
SELECT "id", 6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "tenants"
ON CONFLICT ("tenant_id") DO NOTHING;

-- AddForeignKey
ALTER TABLE "tenant_settings" ADD CONSTRAINT "tenant_settings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
