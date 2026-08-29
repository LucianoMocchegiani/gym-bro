-- Check current state before migration
SELECT 'payments' as table_name, count(*) as row_count FROM payments
UNION ALL
SELECT 'cart_checkouts', count(*) FROM cart_checkouts
UNION ALL
SELECT 'contracts', count(*) FROM contracts
UNION ALL
SELECT 'reservations', count(*) FROM reservations WHERE payment_id IS NOT NULL
UNION ALL
SELECT 'cash_movements', count(*) FROM cash_movements
UNION ALL
SELECT 'receipts', count(*) FROM receipts
UNION ALL
SELECT 'refund_requests', count(*) FROM refund_requests;
