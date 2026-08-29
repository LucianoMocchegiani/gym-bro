-- ============================================
-- MIGRATION: Payment → TransactionItem, CartCheckout → Transaction
-- ============================================
-- This script migrates the data from the old schema to the new schema.
-- Run each section in order.
-- ============================================

-- ============================================
-- STEP 1: Rename tables
-- ============================================

ALTER TABLE payments RENAME TO transaction_items;
ALTER TABLE cart_checkouts RENAME TO transactions;

-- ============================================
-- STEP 2: Add new columns (nullable initially)
-- ============================================

-- Add refunded_amount to transactions
ALTER TABLE transactions ADD COLUMN refunded_amount INTEGER NOT NULL DEFAULT 0;

-- Add transaction_id to transaction_items (replaces cart_id)
ALTER TABLE transaction_items ADD COLUMN transaction_id UUID;

-- Add transaction_item_id to referencing tables
ALTER TABLE contracts ADD COLUMN transaction_item_id UUID;
ALTER TABLE reservations ADD COLUMN transaction_item_id UUID UNIQUE;
ALTER TABLE cash_movements ADD COLUMN transaction_item_id UUID;
ALTER TABLE receipts ADD COLUMN transaction_item_id UUID;
ALTER TABLE refund_requests ADD COLUMN transaction_item_id UUID;

-- ============================================
-- STEP 3: Migrate data
-- ============================================

-- 3a. Migrate cart_id → transaction_id in transaction_items
UPDATE transaction_items SET transaction_id = cart_id WHERE cart_id IS NOT NULL;

-- 3b. Migrate contracts: payment_id → transaction_item_id
UPDATE contracts SET transaction_item_id = payment_id;

-- 3c. Migrate reservations: payment_id → transaction_item_id
UPDATE reservations SET transaction_item_id = payment_id WHERE payment_id IS NOT NULL;

-- 3d. Migrate cash_movements: payment_id → transaction_item_id
UPDATE cash_movements SET transaction_item_id = payment_id;

-- 3e. Migrate receipts: payment_id → transaction_item_id
UPDATE receipts SET transaction_item_id = payment_id;

-- 3f. Migrate refund_requests: payment_id → transaction_item_id
UPDATE refund_requests SET transaction_item_id = payment_id;

-- 3g. Calculate refunded_amount for transactions
-- Sum of refunded transaction_items amounts per transaction
UPDATE transactions t
SET refunded_amount = COALESCE(
  (SELECT SUM(ti.amount)
   FROM transaction_items ti
   WHERE ti.transaction_id = t.id
   AND ti.status = 'REFUNDED'),
  0
);

-- ============================================
-- STEP 4: Set NOT NULL constraints
-- ============================================

-- transaction_items.transaction_id should be NOT NULL for items that were in a cart
-- Standalone payments (not in cart) have NULL transaction_id - that's OK
ALTER TABLE transaction_items ALTER COLUMN transaction_id SET NOT NULL;

-- ============================================
-- STEP 5: Add FK constraints
-- ============================================

-- transaction_items → transactions
ALTER TABLE transaction_items
  ADD CONSTRAINT fk_transaction_items_transaction
  FOREIGN KEY (transaction_id) REFERENCES transactions(id)
  ON DELETE SET NULL;

-- contracts → transaction_items
ALTER TABLE contracts
  ADD CONSTRAINT fk_contracts_transaction_item
  FOREIGN KEY (transaction_item_id) REFERENCES transaction_items(id)
  ON DELETE RESTRICT;

-- reservations → transaction_items
ALTER TABLE reservations
  ADD CONSTRAINT fk_reservations_transaction_item
  FOREIGN KEY (transaction_item_id) REFERENCES transaction_items(id)
  ON DELETE RESTRICT;

-- cash_movements → transaction_items
ALTER TABLE cash_movements
  ADD CONSTRAINT fk_cash_movements_transaction_item
  FOREIGN KEY (transaction_item_id) REFERENCES transaction_items(id)
  ON DELETE RESTRICT;

-- receipts → transaction_items
ALTER TABLE receipts
  ADD CONSTRAINT fk_receipts_transaction_item
  FOREIGN KEY (transaction_item_id) REFERENCES transaction_items(id)
  ON DELETE RESTRICT;

-- refund_requests → transaction_items
ALTER TABLE refund_requests
  ADD CONSTRAINT fk_refund_requests_transaction_item
  FOREIGN KEY (transaction_item_id) REFERENCES transaction_items(id)
  ON DELETE RESTRICT;

-- ============================================
-- STEP 6: Drop old columns
-- ============================================

-- Drop old FKs first (if any exist as constraints)
-- Then drop old columns

ALTER TABLE transaction_items DROP COLUMN cart_id;
ALTER TABLE contracts DROP COLUMN payment_id;
ALTER TABLE reservations DROP COLUMN payment_id;
ALTER TABLE cash_movements DROP COLUMN payment_id;
ALTER TABLE receipts DROP COLUMN payment_id;
ALTER TABLE refund_requests DROP COLUMN payment_id;

-- ============================================
-- STEP 7: Create indexes
-- ============================================

-- Create indexes for new FKs
CREATE INDEX idx_transaction_items_transaction_id ON transaction_items(transaction_id);
CREATE INDEX idx_contracts_transaction_item_id ON contracts(transaction_item_id);
CREATE INDEX idx_reservations_transaction_item_id ON reservations(transaction_item_id);
CREATE INDEX idx_cash_movements_transaction_item_id ON cash_movements(transaction_item_id);
CREATE INDEX idx_receipts_transaction_item_id ON receipts(transaction_item_id);
CREATE INDEX idx_refund_requests_transaction_item_id ON refund_requests(transaction_item_id);

-- ============================================
-- VERIFICATION
-- ============================================

-- Check counts
SELECT 'transaction_items' as table_name, count(*) as rows FROM transaction_items
UNION ALL
SELECT 'transactions', count(*) FROM transactions
UNION ALL
SELECT 'contracts', count(*) FROM contracts
UNION ALL
SELECT 'reservations', count(*) FROM reservations
UNION ALL
SELECT 'cash_movements', count(*) FROM cash_movements
UNION ALL
SELECT 'receipts', count(*) FROM receipts
UNION ALL
SELECT 'refund_requests', count(*) FROM refund_requests;

-- Check for NULLs in new FKs (should be 0 for the ones that should have data)
SELECT 'transaction_items without transaction_id (should be 0): ' || COUNT(*)
FROM transaction_items WHERE cart_id IS NOT NULL AND transaction_id IS NULL;
