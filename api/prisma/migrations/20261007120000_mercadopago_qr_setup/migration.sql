CREATE TABLE "mercadopago_qr_setups" (
    "tenant_id" UUID NOT NULL,
    "mp_user_id" TEXT NOT NULL,
    "store_id" TEXT,
    "pos_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mercadopago_qr_setups_pkey" PRIMARY KEY ("tenant_id")
);
