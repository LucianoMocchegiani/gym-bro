CREATE TABLE "mercadopago_qr_orders" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "transaction_id" UUID NOT NULL,
    "mp_order_id" TEXT NOT NULL,
    "qr_data" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mercadopago_qr_orders_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "mercadopago_qr_orders_transaction_id_key" ON "mercadopago_qr_orders"("transaction_id");
CREATE UNIQUE INDEX "mercadopago_qr_orders_mp_order_id_key" ON "mercadopago_qr_orders"("mp_order_id");
CREATE INDEX "mercadopago_qr_orders_tenant_id_idx" ON "mercadopago_qr_orders"("tenant_id");
