-- CreateEnum
CREATE TYPE "ExpenseNature" AS ENUM ('FIXED', 'VARIABLE');

-- CreateEnum
CREATE TYPE "ExpenseMethod" AS ENUM ('CASH', 'TRANSFER', 'MP', 'CARD');

-- CreateTable
CREATE TABLE "expense_labels" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expense_labels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "business_date" DATE NOT NULL,
    "amount" INTEGER NOT NULL,
    "nature" "ExpenseNature" NOT NULL,
    "method" "ExpenseMethod" NOT NULL,
    "label_id" UUID NOT NULL,
    "note" TEXT,
    "recorded_by_staff_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_files" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "expense_id" UUID NOT NULL,
    "storage_key" TEXT NOT NULL,
    "original_filename" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expense_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "expense_labels_tenant_id_idx" ON "expense_labels"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "expense_labels_tenant_id_name_key" ON "expense_labels"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "expenses_tenant_id_business_date_idx" ON "expenses"("tenant_id", "business_date");

-- CreateIndex
CREATE INDEX "expenses_tenant_id_label_id_idx" ON "expenses"("tenant_id", "label_id");

-- CreateIndex
CREATE INDEX "expense_files_expense_id_idx" ON "expense_files"("expense_id");

-- AddForeignKey
ALTER TABLE "expense_labels" ADD CONSTRAINT "expense_labels_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_label_id_fkey" FOREIGN KEY ("label_id") REFERENCES "expense_labels"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_recorded_by_staff_id_fkey" FOREIGN KEY ("recorded_by_staff_id") REFERENCES "staff_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_files" ADD CONSTRAINT "expense_files_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_files" ADD CONSTRAINT "expense_files_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
