-- Credential offers OID4VCI (pack payment APPROVED → pending accept).
CREATE TYPE "CredentialOfferStatus" AS ENUM ('PENDING', 'FAILED');

CREATE TABLE "credential_offers" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "pack_id" UUID NOT NULL,
    "contract_id" UUID NOT NULL,
    "payment_id" UUID,
    "status" "CredentialOfferStatus" NOT NULL DEFAULT 'PENDING',
    "configuration_id" TEXT NOT NULL,
    "vct" TEXT NOT NULL,
    "offer_uri" TEXT,
    "issuance_session_id" TEXT,
    "claims" JSONB NOT NULL,
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credential_offers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "credential_offers_contract_id_key" ON "credential_offers"("contract_id");
CREATE INDEX "credential_offers_tenant_id_idx" ON "credential_offers"("tenant_id");
CREATE INDEX "credential_offers_member_id_idx" ON "credential_offers"("member_id");
CREATE INDEX "credential_offers_status_idx" ON "credential_offers"("status");

ALTER TABLE "credential_offers" ADD CONSTRAINT "credential_offers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "credential_offers" ADD CONSTRAINT "credential_offers_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "credential_offers" ADD CONSTRAINT "credential_offers_pack_id_fkey" FOREIGN KEY ("pack_id") REFERENCES "packs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "credential_offers" ADD CONSTRAINT "credential_offers_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
