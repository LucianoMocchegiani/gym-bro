-- Drop per-tenant Quark/Kuatia bind columns (wallets are shared via KUATIA_* env).
ALTER TABLE "tenants" DROP COLUMN IF EXISTS "quark_status";
ALTER TABLE "tenants" DROP COLUMN IF EXISTS "quark_issuer_wallet_id";
ALTER TABLE "tenants" DROP COLUMN IF EXISTS "quark_issuer_did";
ALTER TABLE "tenants" DROP COLUMN IF EXISTS "quark_verifier_wallet_id";
ALTER TABLE "tenants" DROP COLUMN IF EXISTS "quark_verifier_did";
ALTER TABLE "tenants" DROP COLUMN IF EXISTS "quark_last_error";
ALTER TABLE "tenants" DROP COLUMN IF EXISTS "quark_provisioned_at";

DROP TYPE IF EXISTS "QuarkProvisionStatus";

-- Rename pack sync columns quark_* → kuatia_*.
ALTER TABLE "packs" RENAME COLUMN "quark_configuration_id" TO "kuatia_configuration_id";
ALTER TABLE "packs" RENAME COLUMN "quark_vct" TO "kuatia_vct";
ALTER TABLE "packs" RENAME COLUMN "quark_synced_at" TO "kuatia_synced_at";
ALTER TABLE "packs" RENAME COLUMN "quark_last_error" TO "kuatia_last_error";
