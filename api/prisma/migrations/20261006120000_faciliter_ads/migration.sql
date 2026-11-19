CREATE TABLE "ad_campaigns" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "target_url" TEXT NOT NULL,
    "placements" TEXT[] NOT NULL DEFAULT ARRAY['MEMBER_PORTAL', 'DASHBOARD', 'GYM_SITE']::TEXT[],
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ad_campaigns_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ad_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "campaign_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "placement" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ad_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ad_campaigns_active_starts_at_ends_at_idx" ON "ad_campaigns"("active", "starts_at", "ends_at");
CREATE INDEX "ad_events_campaign_id_type_created_at_idx" ON "ad_events"("campaign_id", "type", "created_at");
CREATE INDEX "ad_events_tenant_id_created_at_idx" ON "ad_events"("tenant_id", "created_at");
ALTER TABLE "ad_events" ADD CONSTRAINT "ad_events_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "ad_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
