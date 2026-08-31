-- AlterTable
ALTER TABLE "transactions" ADD COLUMN "recorded_by_staff_id" UUID;

-- CreateIndex
CREATE INDEX "transactions_recorded_by_staff_id_idx" ON "transactions"("recorded_by_staff_id");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_recorded_by_staff_id_fkey" FOREIGN KEY ("recorded_by_staff_id") REFERENCES "staff_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
