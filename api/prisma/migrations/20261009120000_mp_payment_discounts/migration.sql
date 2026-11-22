-- RN-PAG-020: Caja defaults for Mercado Pago QR Point and Checkout Pro link.
ALTER TABLE "tenant_settings"
  ADD COLUMN "mp_point_qr_discount_bps" INTEGER NOT NULL DEFAULT 500,
  ADD COLUMN "mp_link_discount_bps" INTEGER NOT NULL DEFAULT 0;
