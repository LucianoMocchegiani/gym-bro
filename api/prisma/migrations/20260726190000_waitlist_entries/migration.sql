-- CreateEnum
CREATE TYPE "WaitlistMode" AS ENUM ('AUTO_ASSIGN', 'MEMBER_CONFIRM', 'STAFF_CONFIRM');

-- CreateEnum
CREATE TYPE "WaitlistStatus" AS ENUM ('WAITING', 'PROMOTED', 'LEFT');

-- AlterTable
ALTER TABLE "tenant_settings" ADD COLUMN "waitlist_mode" "WaitlistMode" NOT NULL DEFAULT 'AUTO_ASSIGN';

-- CreateTable
CREATE TABLE "waitlist_entries" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "status" "WaitlistStatus" NOT NULL DEFAULT 'WAITING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "waitlist_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "waitlist_entries_tenant_id_idx" ON "waitlist_entries"("tenant_id");

-- CreateIndex
CREATE INDEX "waitlist_entries_session_id_status_created_at_idx" ON "waitlist_entries"("session_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "waitlist_entries_member_id_idx" ON "waitlist_entries"("member_id");

-- CreateIndex
-- Un afiliado no puede estar dos veces WAITING en la misma sesión.
CREATE UNIQUE INDEX "waitlist_session_member_waiting_uidx"
  ON "waitlist_entries"("session_id", "member_id")
  WHERE "status" = 'WAITING';

-- AddForeignKey
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
