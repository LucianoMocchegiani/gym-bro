-- Products and inventory for the E-commerce platform module.
CREATE TABLE products (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name varchar(120) NOT NULL,
  description varchar(1000),
  price integer NOT NULL CHECK (price >= 0),
  image_url varchar(2000),
  stock_quantity integer NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, id)
);
CREATE INDEX products_tenant_created_idx ON products (tenant_id, created_at DESC);
CREATE INDEX products_tenant_active_name_idx ON products (tenant_id, active, name);

CREATE TABLE product_stock_movements (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id uuid NOT NULL,
  type varchar(3) NOT NULL CHECK (type IN ('IN', 'OUT')),
  quantity integer NOT NULL CHECK (quantity > 0),
  quantity_delta integer NOT NULL CHECK (quantity_delta <> 0),
  quantity_after integer NOT NULL CHECK (quantity_after >= 0),
  reason varchar(500) NOT NULL CHECK (length(trim(reason)) > 0),
  created_by_staff_id uuid REFERENCES staff_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_stock_movements_delta_check CHECK (
    (type = 'IN' AND quantity_delta = quantity) OR
    (type = 'OUT' AND quantity_delta = -quantity)
  ),
  CONSTRAINT product_stock_movements_product_fk FOREIGN KEY (tenant_id, product_id)
    REFERENCES products(tenant_id, id) ON DELETE CASCADE
);
CREATE INDEX product_stock_movements_tenant_product_created_idx
  ON product_stock_movements (tenant_id, product_id, created_at DESC);
