-- Tenant slug for subdomain routing (demo.localhost / {slug}.gymbro.app).

ALTER TABLE "tenants" ADD COLUMN "slug" TEXT;

UPDATE "tenants"
SET "slug" = 'demo'
WHERE "id" = '00000000-0000-4000-8000-000000000001';

UPDATE "tenants"
SET "slug" = 't-' || REPLACE("id"::text, '-', '')
WHERE "slug" IS NULL;

ALTER TABLE "tenants" ALTER COLUMN "slug" SET NOT NULL;

CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");
