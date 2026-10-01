-- AlterTable
ALTER TABLE "identities" ADD COLUMN "password_temporary" BOOLEAN NOT NULL DEFAULT false;

-- CreateEnum
CREATE TYPE "MemberImportKind" AS ENUM ('ROWS', 'FILES');

-- CreateEnum
CREATE TYPE "MemberImportStatus" AS ENUM ('RUNNING', 'DONE');

-- CreateTable
CREATE TABLE "member_imports" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "kind" "MemberImportKind" NOT NULL,
    "status" "MemberImportStatus" NOT NULL DEFAULT 'RUNNING',
    "filename" TEXT NOT NULL,
    "total_rows" INTEGER NOT NULL,
    "created_count" INTEGER NOT NULL DEFAULT 0,
    "skipped_count" INTEGER NOT NULL DEFAULT 0,
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "mapping" JSONB,
    "created_by_staff_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),

    CONSTRAINT "member_imports_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "member_imports_tenant_id_created_at_idx" ON "member_imports"("tenant_id", "created_at");

ALTER TABLE "member_imports" ADD CONSTRAINT "member_imports_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "member_imports" ADD CONSTRAINT "member_imports_created_by_staff_id_fkey" FOREIGN KEY ("created_by_staff_id") REFERENCES "staff_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
