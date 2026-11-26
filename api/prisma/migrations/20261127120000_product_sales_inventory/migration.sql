CREATE TYPE product_sale_status AS ENUM ('RESERVED', 'SOLD', 'RELEASED');

CREATE TABLE product_sale_items (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  transaction_item_id uuid NOT NULL UNIQUE REFERENCES transaction_items(id) ON DELETE RESTRICT,
  product_id uuid NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  status product_sale_status NOT NULL,
  refunded_at timestamptz,
  restocked boolean,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_sale_items_product_fk FOREIGN KEY (tenant_id, product_id)
    REFERENCES products(tenant_id, id) ON DELETE RESTRICT,
  CONSTRAINT product_sale_items_refund_state CHECK (
    (refunded_at IS NULL AND restocked IS NULL) OR
    (refunded_at IS NOT NULL AND restocked IS NOT NULL)
  )
);
CREATE INDEX product_sale_items_status_idx ON product_sale_items (status);
