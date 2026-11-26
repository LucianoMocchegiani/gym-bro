CREATE OR REPLACE FUNCTION resolve_product_sale_payment_status() RETURNS trigger AS $$
DECLARE
  sale record;
  stock_after integer;
  staff_id uuid;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;
  IF NEW.status NOT IN ('APPROVED'::payment_status, 'REJECTED'::payment_status) THEN
    RETURN NEW;
  END IF;

  FOR sale IN
    UPDATE product_sale_items
    SET status = CASE NEW.status
      WHEN 'APPROVED'::payment_status THEN 'SOLD'::product_sale_status
      ELSE 'RELEASED'::product_sale_status
    END
    WHERE transaction_item_id = NEW.id
      AND tenant_id = NEW.tenant_id
      AND status = 'RESERVED'::product_sale_status
    RETURNING product_id, quantity, status
  LOOP
    SELECT recorded_by_staff_id INTO staff_id
    FROM transactions WHERE id = NEW.transaction_id;

    IF sale.status = 'RELEASED'::product_sale_status THEN
      UPDATE products
      SET stock_quantity = stock_quantity + sale.quantity, updated_at = now()
      WHERE id = sale.product_id AND tenant_id = NEW.tenant_id
      RETURNING stock_quantity INTO stock_after;
      INSERT INTO product_stock_movements
        (id, tenant_id, product_id, type, quantity, quantity_delta,
         quantity_after, reason, created_by_staff_id)
      VALUES
        (gen_random_uuid(), NEW.tenant_id, sale.product_id, 'IN', sale.quantity,
         sale.quantity, stock_after, 'Pago MP rechazado o cancelado; reserva liberada', staff_id);
    ELSE
      SELECT stock_quantity INTO stock_after
      FROM products
      WHERE id = sale.product_id AND tenant_id = NEW.tenant_id
      FOR UPDATE;
      INSERT INTO product_stock_movements
        (id, tenant_id, product_id, type, quantity, quantity_delta,
         quantity_after, reason, created_by_staff_id)
      VALUES
        (gen_random_uuid(), NEW.tenant_id, sale.product_id, 'OUT', sale.quantity,
         -sale.quantity, stock_after, 'Venta MP aprobada', staff_id);
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER transaction_item_product_sale_status
AFTER UPDATE OF status ON transaction_items
FOR EACH ROW EXECUTE FUNCTION resolve_product_sale_payment_status();