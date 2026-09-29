-- Dueño del gym, candados de prueba Faciliter (cuenta + tenant) y flag de contrato de prueba.

ALTER TABLE "identities" ADD COLUMN "platform_trial_used_at" TIMESTAMP(3);

ALTER TABLE "tenants" ADD COLUMN "owner_identity_id" UUID,
ADD COLUMN "platform_trial_used_at" TIMESTAMP(3);

UPDATE "tenants" AS t
SET "owner_identity_id" = s."identity_id"
FROM "staff_users" AS s
WHERE s."id" = (
  SELECT s2."id"
  FROM "staff_users" AS s2
  WHERE s2."tenant_id" = t."id"
  ORDER BY s2."created_at" ASC
  LIMIT 1
);

ALTER TABLE "tenants" ADD CONSTRAINT "tenants_owner_identity_id_fkey" FOREIGN KEY ("owner_identity_id") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "tenants_owner_identity_id_idx" ON "tenants"("owner_identity_id");

ALTER TABLE "contracts" ADD COLUMN "is_platform_trial" BOOLEAN NOT NULL DEFAULT false;
