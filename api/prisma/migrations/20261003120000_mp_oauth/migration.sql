-- CreateEnum
CREATE TYPE "MpConnectionMode" AS ENUM ('MANUAL', 'OAUTH');

-- AlterTable
ALTER TABLE "mercadopago_accounts" ADD COLUMN "connection_mode" "MpConnectionMode" NOT NULL DEFAULT 'MANUAL';
ALTER TABLE "mercadopago_accounts" ADD COLUMN "refresh_token_ciphertext" TEXT;
ALTER TABLE "mercadopago_accounts" ADD COLUMN "token_expires_at" TIMESTAMP(3);
ALTER TABLE "mercadopago_accounts" ADD COLUMN "last_refresh_error" TEXT;

-- CreateTable
CREATE TABLE "mp_oauth_states" (
    "state_hash" TEXT NOT NULL,
    "tenant_id" UUID NOT NULL,
    "actor_user_id" TEXT NOT NULL,
    "code_verifier_ciphertext" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mp_oauth_states_pkey" PRIMARY KEY ("state_hash")
);

CREATE INDEX "mp_oauth_states_expires_at_idx" ON "mp_oauth_states"("expires_at");

ALTER TABLE "mp_oauth_states" ADD CONSTRAINT "mp_oauth_states_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
