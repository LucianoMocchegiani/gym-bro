-- Carrito MP de Caja (modelo MercadoLibre): 1 preference con items[] → 1 pago.
-- Se reparte el APPROVED del pago único a cada payment del carrito.

CREATE TABLE "cart_checkouts" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "PaymentStatus" NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "mp_preference_id" TEXT,
    "mp_payment_id" TEXT,
    "mp_init_point" TEXT,
    "mp_sandbox_init_point" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "cart_checkouts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cart_checkouts_tenant_id_idempotency_key_key" ON "cart_checkouts"("tenant_id", "idempotency_key");
CREATE INDEX "cart_checkouts_tenant_id_idx" ON "cart_checkouts"("tenant_id");
CREATE INDEX "cart_checkouts_member_id_idx" ON "cart_checkouts"("member_id");

ALTER TABLE "payments" ADD COLUMN "cart_id" UUID;
ALTER TABLE "payments" ADD CONSTRAINT "payments_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "cart_checkouts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "payments_cart_id_idx" ON "payments"("cart_id");

ALTER TABLE "cart_checkouts" ADD CONSTRAINT "cart_checkouts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cart_checkouts" ADD CONSTRAINT "cart_checkouts_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;