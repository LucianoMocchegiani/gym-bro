ALTER TABLE "transactions"
ADD COLUMN "mp_order_id" TEXT,
ADD COLUMN "mp_qr_data" TEXT;

CREATE UNIQUE INDEX "transactions_mp_order_id_key" ON "transactions"("mp_order_id");
