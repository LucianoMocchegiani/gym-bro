-- Credencial SSI staff (molinete) + sujeto en access_attempts
ALTER TABLE "access_attempts" ADD COLUMN "subject_staff_id" UUID;

ALTER TABLE "access_attempts"
  ADD CONSTRAINT "access_attempts_subject_staff_id_fkey"
  FOREIGN KEY ("subject_staff_id") REFERENCES "staff_users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "access_attempts_subject_staff_id_created_at_idx"
  ON "access_attempts"("subject_staff_id", "created_at");

CREATE TABLE "staff_credential_offers" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "staff_user_id" UUID NOT NULL,
  "status" "CredentialOfferStatus" NOT NULL DEFAULT 'PENDING',
  "offer_uri" TEXT,
  "last_error" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "staff_credential_offers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "staff_credential_offers_staff_user_id_key"
  ON "staff_credential_offers"("staff_user_id");

CREATE INDEX "staff_credential_offers_tenant_id_idx"
  ON "staff_credential_offers"("tenant_id");

CREATE INDEX "staff_credential_offers_status_idx"
  ON "staff_credential_offers"("status");

ALTER TABLE "staff_credential_offers"
  ADD CONSTRAINT "staff_credential_offers_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "staff_credential_offers"
  ADD CONSTRAINT "staff_credential_offers_staff_user_id_fkey"
  FOREIGN KEY ("staff_user_id") REFERENCES "staff_users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
