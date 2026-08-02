-- Quark issuer/verifier refs on tenants (soft-fail provisioning).
CREATE TYPE "QuarkProvisionStatus" AS ENUM ('MISSING', 'READY');

ALTER TABLE "tenants"
  ADD COLUMN "quark_status" "QuarkProvisionStatus" NOT NULL DEFAULT 'MISSING',
  ADD COLUMN "quark_issuer_wallet_id" TEXT,
  ADD COLUMN "quark_issuer_did" TEXT,
  ADD COLUMN "quark_verifier_wallet_id" TEXT,
  ADD COLUMN "quark_verifier_did" TEXT,
  ADD COLUMN "quark_last_error" TEXT,
  ADD COLUMN "quark_provisioned_at" TIMESTAMP(3);
