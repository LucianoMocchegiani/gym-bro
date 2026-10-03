-- Alta web del socio: la solicitud espera el pago; el socio nace en el webhook (RN-CTA-007).
CREATE TYPE "MemberSignupStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

CREATE TABLE "member_signups" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "identity_id" UUID NOT NULL,
    "pack_id" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "document" TEXT NOT NULL,
    "phone" TEXT,
    "status" "MemberSignupStatus" NOT NULL DEFAULT 'PENDING',
    "mp_preference_id" TEXT,
    "member_id" UUID,
    "transaction_id" UUID,
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "member_signups_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "member_signups_member_id_key" ON "member_signups"("member_id");
CREATE UNIQUE INDEX "member_signups_transaction_id_key" ON "member_signups"("transaction_id");
CREATE INDEX "member_signups_tenant_id_identity_id_status_idx" ON "member_signups"("tenant_id", "identity_id", "status");

ALTER TABLE "member_signups" ADD CONSTRAINT "member_signups_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "member_signups" ADD CONSTRAINT "member_signups_identity_id_fkey" FOREIGN KEY ("identity_id") REFERENCES "identities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "member_signups" ADD CONSTRAINT "member_signups_pack_id_fkey" FOREIGN KEY ("pack_id") REFERENCES "packs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "member_signups" ADD CONSTRAINT "member_signups_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "member_signups" ADD CONSTRAINT "member_signups_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
