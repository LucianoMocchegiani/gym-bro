ALTER TABLE "notifications" ALTER COLUMN "member_id" DROP NOT NULL;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "identity_id" UUID;

ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_identity_id_fkey"
  FOREIGN KEY ("identity_id") REFERENCES "identities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "notifications_tenant_id_identity_id_created_at_idx"
  ON "notifications" ("tenant_id", "identity_id", "created_at");

ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_audience_chk"
  CHECK (
    ("member_id" IS NOT NULL AND "identity_id" IS NULL)
    OR ("member_id" IS NULL AND "identity_id" IS NOT NULL)
  );
