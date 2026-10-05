-- Medio de pago Transferencia (Caja).
ALTER TYPE "PaymentMethod" ADD VALUE 'TRANSFER';

-- RN-PAG-020: descuento por defecto en Caja para efectivo y transferencia (centésimas de %).
ALTER TABLE "tenant_settings" ADD COLUMN "cash_discount_bps" INTEGER NOT NULL DEFAULT 760;
ALTER TABLE "tenant_settings" ADD COLUMN "transfer_discount_bps" INTEGER NOT NULL DEFAULT 760;

-- Precio de lista y descuento aplicado por ítem.
ALTER TABLE "transaction_items" ADD COLUMN "list_amount" INTEGER;
ALTER TABLE "transaction_items" ADD COLUMN "discount_bps" INTEGER NOT NULL DEFAULT 0;

-- Referencia opcional de la transferencia.
ALTER TABLE "transactions" ADD COLUMN "transfer_reference" TEXT;
