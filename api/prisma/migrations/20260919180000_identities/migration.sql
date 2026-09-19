-- AlterEnum
ALTER TYPE "AuthProfileType" ADD VALUE 'IDENTITY';

-- CreateTable
CREATE TABLE "identities" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "google_sub" TEXT,
    "apple_sub" TEXT,
    "name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "identities_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "identities_email_key" ON "identities"("email");
CREATE UNIQUE INDEX "identities_google_sub_key" ON "identities"("google_sub");
CREATE UNIQUE INDEX "identities_apple_sub_key" ON "identities"("apple_sub");

-- Backfill: una identity por email (members ∪ staff)
INSERT INTO "identities" ("id", "email", "password_hash", "name", "created_at", "updated_at")
SELECT
    gen_random_uuid(),
    u.email,
    (ARRAY_AGG(u.password_hash ORDER BY u.created_at ASC))[1],
    (ARRAY_AGG(u.name ORDER BY u.created_at ASC) FILTER (WHERE u.name IS NOT NULL))[1],
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM (
    SELECT lower(email) AS email, password_hash, name, created_at FROM "members"
    UNION ALL
    SELECT lower(email) AS email, password_hash, name, created_at FROM "staff_users"
) u
GROUP BY u.email;

ALTER TABLE "staff_users" ADD COLUMN "identity_id" UUID;
ALTER TABLE "members" ADD COLUMN "identity_id" UUID;
ALTER TABLE "refresh_tokens" ADD COLUMN "identity_id" UUID;

UPDATE "staff_users" s
SET "identity_id" = i.id
FROM "identities" i
WHERE lower(s.email) = i.email;

UPDATE "members" m
SET "identity_id" = i.id
FROM "identities" i
WHERE lower(m.email) = i.email;

ALTER TABLE "staff_users" ALTER COLUMN "identity_id" SET NOT NULL;
ALTER TABLE "members" ALTER COLUMN "identity_id" SET NOT NULL;

CREATE UNIQUE INDEX "staff_users_tenant_id_identity_id_key" ON "staff_users"("tenant_id", "identity_id");
CREATE INDEX "staff_users_identity_id_idx" ON "staff_users"("identity_id");
CREATE UNIQUE INDEX "members_tenant_id_identity_id_key" ON "members"("tenant_id", "identity_id");
CREATE INDEX "members_identity_id_idx" ON "members"("identity_id");
CREATE INDEX "refresh_tokens_identity_id_idx" ON "refresh_tokens"("identity_id");

ALTER TABLE "staff_users" ADD CONSTRAINT "staff_users_identity_id_fkey" FOREIGN KEY ("identity_id") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "members" ADD CONSTRAINT "members_identity_id_fkey" FOREIGN KEY ("identity_id") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_identity_id_fkey" FOREIGN KEY ("identity_id") REFERENCES "identities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
