-- Alta self-serve: gym nace en el webhook de preapproval / cobro MP.

CREATE TYPE "PlatformSignupStatus" AS ENUM ('PENDING', 'AWAITING_PAYMENT', 'COMPLETED', 'FAILED');

CREATE TABLE "platform_signups" (
    "id" UUID NOT NULL,
    "identity_id" UUID NOT NULL,
    "gym_name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "pack_id" UUID NOT NULL,
    "apply_trial" BOOLEAN NOT NULL,
    "status" "PlatformSignupStatus" NOT NULL,
    "mp_preapproval_id" TEXT,
    "mp_preapproval_plan_id" TEXT,
    "init_point" TEXT,
    "tenant_id" UUID,
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_signups_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "platform_signups_mp_preapproval_id_key" ON "platform_signups"("mp_preapproval_id");
CREATE UNIQUE INDEX "platform_signups_tenant_id_key" ON "platform_signups"("tenant_id");
CREATE INDEX "platform_signups_identity_id_status_idx" ON "platform_signups"("identity_id", "status");
CREATE INDEX "platform_signups_slug_idx" ON "platform_signups"("slug");
CREATE UNIQUE INDEX "platform_signups_open_slug_uidx" ON "platform_signups"("slug") WHERE status IN ('PENDING', 'AWAITING_PAYMENT');

ALTER TABLE "platform_signups" ADD CONSTRAINT "platform_signups_identity_id_fkey" FOREIGN KEY ("identity_id") REFERENCES "identities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "platform_signups" ADD CONSTRAINT "platform_signups_pack_id_fkey" FOREIGN KEY ("pack_id") REFERENCES "packs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "platform_signups" ADD CONSTRAINT "platform_signups_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
