-- AlterEnum
ALTER TYPE "ReceiptConcept" ADD VALUE IF NOT EXISTS 'REFUND';

-- DropIndex (un cobro + N devoluciones por cart)
DROP INDEX IF EXISTS "receipts_transaction_id_key";

-- AlterTable
ALTER TABLE "cash_movements" ADD COLUMN "receipt_id" UUID;

-- CreateIndex
CREATE INDEX "cash_movements_receipt_id_idx" ON "cash_movements"("receipt_id");

-- AddForeignKey
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_receipt_id_fkey"
  FOREIGN KEY ("receipt_id") REFERENCES "receipts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
