-- Políticas de acceso + intentos de ingreso + presente en reserva (E6 verify).

ALTER TABLE "tenant_settings"
  ADD COLUMN "debt_tolerance_days" INTEGER NOT NULL DEFAULT 15,
  ADD COLUMN "multi_entry_enabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "multi_entry_max_per_day" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "reservations"
  ADD COLUMN "checked_in_at" TIMESTAMP(3);

CREATE TYPE "AccessAttemptResult" AS ENUM ('ALLOWED', 'DENIED');

CREATE TABLE "access_attempts" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "member_id" UUID,
    "credential_ref" TEXT,
    "result" "AccessAttemptResult" NOT NULL,
    "reason_code" TEXT NOT NULL,
    "scan_mode" TEXT NOT NULL,
    "reservation_id" UUID,
    "session_id" UUID,
    "manual_pass" BOOLEAN NOT NULL DEFAULT false,
    "actor_staff_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "access_attempts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "access_attempts_tenant_id_created_at_idx" ON "access_attempts"("tenant_id", "created_at");
CREATE INDEX "access_attempts_member_id_created_at_idx" ON "access_attempts"("member_id", "created_at");
CREATE INDEX "access_attempts_tenant_id_member_id_result_created_at_idx" ON "access_attempts"("tenant_id", "member_id", "result", "created_at");

ALTER TABLE "access_attempts" ADD CONSTRAINT "access_attempts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "access_attempts" ADD CONSTRAINT "access_attempts_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "access_attempts" ADD CONSTRAINT "access_attempts_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "access_attempts" ADD CONSTRAINT "access_attempts_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "access_attempts" ADD CONSTRAINT "access_attempts_actor_staff_id_fkey" FOREIGN KEY ("actor_staff_id") REFERENCES "staff_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
