-- CreateEnum
CREATE TYPE "FolderItemKind" AS ENUM ('NOTE', 'FILE');

-- CreateTable
CREATE TABLE "folder_labels" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "folder_labels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "folder_items" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "kind" "FolderItemKind" NOT NULL,
    "title" TEXT,
    "body" TEXT,
    "storage_key" TEXT,
    "original_filename" TEXT,
    "mime" TEXT,
    "size_bytes" INTEGER,
    "label_id" UUID,
    "member_id" UUID,
    "staff_user_id" UUID,
    "created_by_staff_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "folder_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "folder_items_owner_xor" CHECK (
      (member_id IS NOT NULL AND staff_user_id IS NULL)
      OR (member_id IS NULL AND staff_user_id IS NOT NULL)
    )
);

CREATE UNIQUE INDEX "folder_labels_tenant_id_name_key" ON "folder_labels"("tenant_id", "name");
CREATE INDEX "folder_labels_tenant_id_idx" ON "folder_labels"("tenant_id");
CREATE INDEX "folder_items_tenant_id_member_id_created_at_idx" ON "folder_items"("tenant_id", "member_id", "created_at");
CREATE INDEX "folder_items_tenant_id_staff_user_id_created_at_idx" ON "folder_items"("tenant_id", "staff_user_id", "created_at");

ALTER TABLE "folder_labels" ADD CONSTRAINT "folder_labels_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "folder_items" ADD CONSTRAINT "folder_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "folder_items" ADD CONSTRAINT "folder_items_label_id_fkey" FOREIGN KEY ("label_id") REFERENCES "folder_labels"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "folder_items" ADD CONSTRAINT "folder_items_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "folder_items" ADD CONSTRAINT "folder_items_staff_user_id_fkey" FOREIGN KEY ("staff_user_id") REFERENCES "staff_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "folder_items" ADD CONSTRAINT "folder_items_created_by_staff_id_fkey" FOREIGN KEY ("created_by_staff_id") REFERENCES "staff_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
