-- Cuenta Mercado Pago del gym (CU-PAG-006 / RN-PAG-001).

CREATE TABLE "mercadopago_accounts" (
    "tenant_id" UUID NOT NULL,
    "access_token_ciphertext" TEXT NOT NULL,
    "public_key" TEXT NOT NULL,
    "mp_user_id" TEXT,
    "last_validated_at" TIMESTAMP(3),
    "last_validation_ok" BOOLEAN,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mercadopago_accounts_pkey" PRIMARY KEY ("tenant_id")
);

ALTER TABLE "mercadopago_accounts" ADD CONSTRAINT "mercadopago_accounts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
