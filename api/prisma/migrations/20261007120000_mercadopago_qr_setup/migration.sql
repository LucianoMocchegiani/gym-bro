CREATE TABLE "mercadopago_qr_setups" (
    "tenant_id" UUID NOT NULL,
    "mp_user_id" TEXT NOT NULL,
    "store_id" TEXT,
    "pos_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mercadopago_qr_setups_pkey" PRIMARY KEY ("tenant_id")
);

ALTER TABLE "mercadopago_qr_setups"
ADD CONSTRAINT "mercadopago_qr_setups_tenant_id_fkey"
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
