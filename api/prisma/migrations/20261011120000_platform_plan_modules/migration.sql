CREATE TABLE "platform_plan_modules" (
  "pack_id" UUID NOT NULL,
  "modules" TEXT[] NOT NULL DEFAULT ARRAY['club']::TEXT[],
  CONSTRAINT "platform_plan_modules_pkey" PRIMARY KEY ("pack_id")
);

-- Existing platform offers retain the current Club functionality.
INSERT INTO "platform_plan_modules" ("pack_id", "modules")
SELECT p."id", ARRAY['club']::TEXT[]
FROM "packs" p
JOIN "tenants" t ON t."id" = p."tenant_id"
WHERE t."slug" = 'admin' AND p."origin_service_id" IS NULL;
