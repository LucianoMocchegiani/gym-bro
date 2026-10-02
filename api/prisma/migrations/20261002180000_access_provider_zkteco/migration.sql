-- CreateEnum
CREATE TYPE "AccessProvider" AS ENUM ('KUATIA', 'ZKTECO');

-- AlterTable
ALTER TABLE "tenant_settings" ADD COLUMN "access_provider" "AccessProvider" NOT NULL DEFAULT 'KUATIA';

-- AlterTable
ALTER TABLE "access_attempts" ADD COLUMN "channel" TEXT NOT NULL DEFAULT 'kuatia';

-- Backfill: los pases manuales no vinieron por Kuatia.
UPDATE "access_attempts" SET "channel" = 'manual' WHERE "manual_pass" = true OR "scan_mode" = 'manual';

-- CreateTable
CREATE TABLE "access_identity_links" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "provider" "AccessProvider" NOT NULL,
    "external_id" TEXT NOT NULL,
    "member_id" UUID,
    "staff_user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "access_identity_links_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "access_identity_links_one_subject" CHECK (("member_id" IS NULL) <> ("staff_user_id" IS NULL))
);

-- CreateIndex
CREATE UNIQUE INDEX "access_identity_links_tenant_id_provider_external_id_key" ON "access_identity_links"("tenant_id", "provider", "external_id");

-- CreateIndex
CREATE INDEX "access_identity_links_member_id_idx" ON "access_identity_links"("member_id");

-- CreateIndex
CREATE INDEX "access_identity_links_staff_user_id_idx" ON "access_identity_links"("staff_user_id");

-- AddForeignKey
ALTER TABLE "access_identity_links" ADD CONSTRAINT "access_identity_links_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_identity_links" ADD CONSTRAINT "access_identity_links_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_identity_links" ADD CONSTRAINT "access_identity_links_staff_user_id_fkey" FOREIGN KEY ("staff_user_id") REFERENCES "staff_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
