-- Checkout MP drop-in: payments.session_id

ALTER TABLE "payments" ADD COLUMN "session_id" UUID;

CREATE INDEX "payments_session_id_idx" ON "payments"("session_id");

ALTER TABLE "payments" ADD CONSTRAINT "payments_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
