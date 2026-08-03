-- Slim credential_offers: claims/config/vct/payment/session se reconstruyen o no se persisten.
-- Reemitir = ensureOfferForContract desde el contrato.
ALTER TABLE "credential_offers" DROP COLUMN IF EXISTS "payment_id";
ALTER TABLE "credential_offers" DROP COLUMN IF EXISTS "configuration_id";
ALTER TABLE "credential_offers" DROP COLUMN IF EXISTS "vct";
ALTER TABLE "credential_offers" DROP COLUMN IF EXISTS "issuance_session_id";
ALTER TABLE "credential_offers" DROP COLUMN IF EXISTS "claims";
