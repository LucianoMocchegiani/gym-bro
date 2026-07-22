-- Estado afiliado + ficha (CU-AFI-001..003).
CREATE TYPE "MemberStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'INACTIVE');

ALTER TABLE "members" ADD COLUMN "phone" TEXT;
ALTER TABLE "members" ADD COLUMN "document" TEXT;
ALTER TABLE "members" ADD COLUMN "branch_id" UUID;
ALTER TABLE "members" ADD COLUMN "status" "MemberStatus" NOT NULL DEFAULT 'ACTIVE';

UPDATE "members"
SET "status" = CASE WHEN "active" = true THEN 'ACTIVE'::"MemberStatus" ELSE 'INACTIVE'::"MemberStatus" END;

ALTER TABLE "members" DROP COLUMN "active";

CREATE UNIQUE INDEX "members_tenant_id_document_key" ON "members"("tenant_id", "document");

CREATE INDEX "members_branch_id_idx" ON "members"("branch_id");

ALTER TABLE "members" ADD CONSTRAINT "members_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
