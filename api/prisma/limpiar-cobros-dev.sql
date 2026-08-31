-- GymBro — limpiar cobros de prueba (solo local / Docker).
-- No toca catálogo, afiliados, staff, tenants ni cuenta MP.
-- El próximo comprobante vuelve a GB-000001.
--
-- Uso (repo root):
-- Get-Content -Raw api\prisma\limpiar-cobros-dev.sql | docker compose exec -T postgres psql -U gymbro -d gymbro -v ON_ERROR_STOP=1

BEGIN;

UPDATE access_attempts SET reservation_id = NULL WHERE reservation_id IS NOT NULL;

DELETE FROM refund_requests;
DELETE FROM cash_movements;
DELETE FROM receipts;
DELETE FROM cash_reconciliations;
DELETE FROM waitlist_entries;
DELETE FROM reservations;
DELETE FROM credential_offers;
DELETE FROM contract_credit_balances;
DELETE FROM contracts;
DELETE FROM transaction_items;
DELETE FROM transactions;

UPDATE receipt_sequences SET next_number = 1;
UPDATE sessions SET booked_count = 0;

COMMIT;

SELECT
  (SELECT count(*) FROM transactions) AS transactions,
  (SELECT count(*) FROM transaction_items) AS items,
  (SELECT count(*) FROM receipts) AS receipts,
  (SELECT count(*) FROM cash_movements) AS caja,
  (SELECT count(*) FROM contracts) AS contracts,
  (SELECT count(*) FROM reservations) AS reservations,
  (SELECT next_number FROM receipt_sequences LIMIT 1) AS next_receipt;
