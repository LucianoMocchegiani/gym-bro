-- Create transactions for standalone payments (no cart_id)
INSERT INTO transactions (id, tenant_id, member_id, amount, status, idempotency_key, refunded_amount, created_at, updated_at)
SELECT
  gen_random_uuid(),
  ti.tenant_id,
  ti.member_id,
  ti.amount,
  ti.status,
  'migrated-' || ti.idempotency_key,
  CASE WHEN ti.status = 'REFUNDED' THEN ti.amount ELSE 0 END,
  ti.created_at,
  ti.updated_at
FROM transaction_items ti
WHERE ti.transaction_id IS NULL;

-- Update transaction_items to link to new transactions
UPDATE transaction_items ti
SET transaction_id = t.id
FROM transactions t
WHERE t.idempotency_key = 'migrated-' || ti.idempotency_key
  AND ti.transaction_id IS NULL;
