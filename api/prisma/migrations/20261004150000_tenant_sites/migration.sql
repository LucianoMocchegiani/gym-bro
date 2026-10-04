-- Web pública del gym editable (RN-CTA-010): hero y sliders en JSON validado por la API.
CREATE TABLE "tenant_sites" (
    "tenant_id" UUID NOT NULL,
    "content" JSONB NOT NULL,
    "updated_by_staff_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_sites_pkey" PRIMARY KEY ("tenant_id")
);

ALTER TABLE "tenant_sites" ADD CONSTRAINT "tenant_sites_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
