-- Devoluciones: egreso de caja + solicitudes + campos refund en payments.

ALTER TYPE "CashMovementKind" ADD VALUE 'OUTCOME';
ALTER TYPE "CashMovementConcept" ADD VALUE 'REFUND';

CREATE TYPE "RefundRequestStatus" AS ENUM ('PENDING', 'REJECTED', 'EXECUTED');

ALTER TABLE "payments"
  ADD COLUMN "refunded_at" TIMESTAMP(3),
  ADD COLUMN "refund_reason" TEXT,
  ADD COLUMN "mp_refund_manual_pending" BOOLEAN NOT NULL DEFAULT false;

DROP INDEX IF EXISTS "cash_movements_payment_id_key";
CREATE UNIQUE INDEX "cash_movements_payment_id_kind_key" ON "cash_movements"("payment_id", "kind");

CREATE TABLE "refund_requests" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "payment_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "status" "RefundRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "rejection_reason" TEXT,
    "resolved_by_staff_id" UUID,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refund_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "refund_requests_tenant_id_status_idx" ON "refund_requests"("tenant_id", "status");
CREATE INDEX "refund_requests_member_id_created_at_idx" ON "refund_requests"("member_id", "created_at");
CREATE INDEX "refund_requests_payment_id_idx" ON "refund_requests"("payment_id");

ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_resolved_by_staff_id_fkey" FOREIGN KEY ("resolved_by_staff_id") REFERENCES "staff_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
