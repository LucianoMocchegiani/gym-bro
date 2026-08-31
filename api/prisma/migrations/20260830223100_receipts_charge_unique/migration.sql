-- Unique parcial: a lo sumo un comprobante de cobro por cart
-- (el valor REFUND se agregó en la migración anterior; no se puede usar en la misma tx).
CREATE UNIQUE INDEX "receipts_transaction_id_charge_uidx"
  ON "receipts" ("transaction_id")
  WHERE "transaction_id" IS NOT NULL AND "concept" <> 'REFUND';
