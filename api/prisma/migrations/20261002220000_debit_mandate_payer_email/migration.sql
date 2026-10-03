-- Mail de la cuenta Mercado Pago que autoriza la suscripción (puede diferir del mail del afiliado).
ALTER TABLE "debit_mandates" ADD COLUMN "mp_payer_email" TEXT;
