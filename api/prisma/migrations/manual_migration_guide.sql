-- Migration: rename Payment→TransactionItem and CartCheckout→Transaction
-- Status: PENDING - requires manual data migration
-- Date: 2026-08-28
--
-- IMPORTANT: This migration requires handling existing data.
-- Follow the steps below carefully.
--
-- STEP 1: Add new columns (nullable first)
-- STEP 2: Migrate data from old columns to new columns
-- STEP 3: Set NOT NULL constraints
-- STEP 4: Drop old columns and constraints
-- STEP 5: Rename tables

-- ============================================
-- STEP 1: Add new columns (nullable)
-- ============================================

-- Add transaction_id to transaction_items (formerly cart_id)
ALTER TABLE transaction_items ADD COLUMN transaction_id UUID;
ALTER TABLE transaction_items ADD CONSTRAINT fk_transaction_items_transaction
  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE SET NULL;

-- Add refunded_amount to transactions (new column)
ALTER TABLE transactions ADD COLUMN refunded_amount INT NOT NULL DEFAULT 0;

-- Add transaction_item_id to tables that reference Payment
ALTER TABLE contracts ADD COLUMN transaction_item_id UUID;
ALTER TABLE reservations ADD COLUMN transaction_item_id UUID UNIQUE;
ALTER TABLE cash_movements ADD COLUMN transaction_item_id UUID;
ALTER TABLE receipts ADD COLUMN transaction_item_id UUID;
ALTER TABLE refund_requests ADD COLUMN transaction_item_id UUID;

-- ============================================
-- STEP 2: Migrate data
-- ============================================

-- Migrate cart_id → transaction_id in transaction_items
UPDATE transaction_items SET transaction_id = cart_id WHERE cart_id IS NOT NULL;

-- Migrate payment_id → transaction_item_id in contracts
-- Each contract has a payment, so we map the payment's id to transaction_item_id
UPDATE contracts SET transaction_item_id = payment_id;

-- Migrate payment_id → transaction_item_id in reservations
UPDATE reservations SET transaction_item_id = payment_id WHERE payment_id IS NOT NULL;

-- Migrate payment_id → transaction_item_id in cash_movements
UPDATE cash_movements SET transaction_item_id = payment_id;

-- Migrate payment_id → transaction_item_id in receipts
UPDATE receipts SET transaction_item_id = payment_id;

-- Migrate payment_id → transaction_item_id in refund_requests
UPDATE refund_requests SET transaction_item_id = payment_id;

-- Calculate refunded_amount for transactions
-- This should be the sum of refunded amounts from all transaction_items
UPDATE transactions t
SET refunded_amount = COALESCE(
  (SELECT SUM(ti.amount)
   FROM transaction_items ti
   WHERE ti.transaction_id = t.id
   AND ti.status = 'REFUNDED'),
  0
);

-- ============================================
-- STEP 3: Set NOT NULL constraints
-- ============================================

-- transaction_items.transaction_id can be NOT NULL after migration
-- (all rows with cart_id should have been migrated)

ALTER TABLE transaction_items ALTER COLUMN transaction_id SET NOT NULL;

-- All the referencing tables should now have transaction_item_id populated
-- You may need to handle any NULL values before setting NOT NULL

-- ============================================
-- STEP 4: Drop old columns
-- ============================================

-- Drop old FK and columns from referencing tables
ALTER TABLE contracts DROP COLUMN payment_id;
ALTER TABLE reservations DROP COLUMN payment_id;
ALTER TABLE cash_movements DROP COLUMN payment_id;
ALTER TABLE receipts DROP COLUMN payment_id;
ALTER TABLE refund_requests DROP COLUMN payment_id;

-- Drop old column from transaction_items
ALTER TABLE transaction_items DROP COLUMN cart_id;

-- ============================================
-- STEP 5: Rename tables (optional - done by Prisma)
-- ============================================
-- Prisma will handle table rename via @@map:
-- payments → transaction_items
-- cart_checkouts → transactions

-- ============================================
-- ADDITIONAL: Drop unique constraints that referenced old columns
-- ============================================

-- These will be recreated by Prisma with the new column names
