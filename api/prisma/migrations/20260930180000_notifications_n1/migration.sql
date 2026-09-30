-- CreateEnum
CREATE TYPE "NotificationEventCode" AS ENUM ('PAYMENT_APPROVED');

-- CreateEnum
CREATE TYPE "NotificationEmailStatus" AS ENUM ('SKIPPED', 'SENT', 'FAILED');

CREATE TABLE "notification_templates" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "event_code" "NotificationEventCode" NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notification_preferences" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "event_code" "NotificationEventCode" NOT NULL,
    "email_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "event_code" "NotificationEventCode" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "payload" JSONB,
    "in_app_read" BOOLEAN NOT NULL DEFAULT false,
    "email_status" "NotificationEmailStatus" NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "notification_templates_tenant_id_event_code_key" ON "notification_templates"("tenant_id", "event_code");
CREATE INDEX "notification_templates_tenant_id_idx" ON "notification_templates"("tenant_id");
CREATE UNIQUE INDEX "notification_preferences_tenant_id_member_id_event_code_key" ON "notification_preferences"("tenant_id", "member_id", "event_code");
CREATE INDEX "notification_preferences_tenant_id_member_id_idx" ON "notification_preferences"("tenant_id", "member_id");
CREATE UNIQUE INDEX "notifications_tenant_id_idempotency_key_key" ON "notifications"("tenant_id", "idempotency_key");
CREATE INDEX "notifications_tenant_id_member_id_created_at_idx" ON "notifications"("tenant_id", "member_id", "created_at");

ALTER TABLE "notification_templates" ADD CONSTRAINT "notification_templates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
