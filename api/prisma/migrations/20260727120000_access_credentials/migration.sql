-- Credenciales de vínculo de acceso (E6 / RN-ACC-002). Stub SSI.

CREATE TYPE "AccessCredentialStatus" AS ENUM ('ACTIVE', 'REVOKED');

CREATE TABLE "access_credentials" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "credential_ref" TEXT NOT NULL,
    "status" "AccessCredentialStatus" NOT NULL DEFAULT 'ACTIVE',
    "provider" TEXT NOT NULL DEFAULT 'stub',
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "access_credentials_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "access_credentials_credential_ref_key" ON "access_credentials"("credential_ref");
CREATE INDEX "access_credentials_tenant_id_member_id_idx" ON "access_credentials"("tenant_id", "member_id");
CREATE INDEX "access_credentials_member_id_status_idx" ON "access_credentials"("member_id", "status");
-- A lo sumo una credencial ACTIVE por afiliado.
CREATE UNIQUE INDEX "access_credentials_member_active_uidx"
  ON "access_credentials"("member_id")
  WHERE "status" = 'ACTIVE';

ALTER TABLE "access_credentials" ADD CONSTRAINT "access_credentials_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "access_credentials" ADD CONSTRAINT "access_credentials_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
