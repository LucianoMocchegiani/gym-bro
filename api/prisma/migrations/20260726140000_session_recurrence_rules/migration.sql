-- CreateEnum
CREATE TYPE "Weekday" AS ENUM (
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY'
);

-- CreateTable
CREATE TABLE "session_recurrence_rules" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "service_id" UUID NOT NULL,
  "branch_id" UUID NOT NULL,
  "instructor_id" UUID,
  "weekdays" "Weekday"[],
  "local_start_time" TEXT NOT NULL,
  "duration_minutes" INTEGER NOT NULL,
  "timezone" TEXT NOT NULL,
  "starts_on" DATE NOT NULL,
  "ends_on" DATE NOT NULL,
  "capacity" INTEGER NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "session_recurrence_rules_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "sessions" ADD COLUMN "recurrence_rule_id" UUID;

-- CreateIndex
CREATE INDEX "session_recurrence_rules_tenant_id_idx"
  ON "session_recurrence_rules"("tenant_id");
CREATE INDEX "session_recurrence_rules_service_id_idx"
  ON "session_recurrence_rules"("service_id");
CREATE INDEX "session_recurrence_rules_branch_id_idx"
  ON "session_recurrence_rules"("branch_id");
CREATE INDEX "session_recurrence_rules_instructor_id_idx"
  ON "session_recurrence_rules"("instructor_id");
CREATE UNIQUE INDEX "sessions_recurrence_rule_id_starts_at_key"
  ON "sessions"("recurrence_rule_id", "starts_at");
CREATE INDEX "sessions_recurrence_rule_id_idx"
  ON "sessions"("recurrence_rule_id");

-- AddForeignKey
ALTER TABLE "session_recurrence_rules"
  ADD CONSTRAINT "session_recurrence_rules_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "session_recurrence_rules"
  ADD CONSTRAINT "session_recurrence_rules_service_id_fkey"
  FOREIGN KEY ("service_id") REFERENCES "services"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "session_recurrence_rules"
  ADD CONSTRAINT "session_recurrence_rules_branch_id_fkey"
  FOREIGN KEY ("branch_id") REFERENCES "branches"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "session_recurrence_rules"
  ADD CONSTRAINT "session_recurrence_rules_instructor_id_fkey"
  FOREIGN KEY ("instructor_id") REFERENCES "staff_users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sessions"
  ADD CONSTRAINT "sessions_recurrence_rule_id_fkey"
  FOREIGN KEY ("recurrence_rule_id") REFERENCES "session_recurrence_rules"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
