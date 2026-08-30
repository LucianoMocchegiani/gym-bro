-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "CredentialOfferStatus" AS ENUM ('PENDING', 'FAILED', 'ACCEPTED');

-- CreateEnum
CREATE TYPE "AuthProfileType" AS ENUM ('SUPER', 'STAFF', 'MEMBER');

-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "AccessAttemptResult" AS ENUM ('ALLOWED', 'DENIED');

-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('ACCESO_LIBRE', 'POR_SESIONES');

-- CreateEnum
CREATE TYPE "BillingPeriod" AS ENUM ('MONTHLY', 'ONE_TIME');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('STUB', 'CASH', 'MP');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('PUBLISHED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "Weekday" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReservationCoverage" AS ENUM ('CREDIT', 'DROP_IN');

-- CreateEnum
CREATE TYPE "WaitlistMode" AS ENUM ('AUTO_ASSIGN', 'MEMBER_CONFIRM', 'STAFF_CONFIRM');

-- CreateEnum
CREATE TYPE "WaitlistStatus" AS ENUM ('WAITING', 'PROMOTED', 'LEFT');

-- CreateEnum
CREATE TYPE "CashMovementKind" AS ENUM ('INCOME', 'OUTCOME');

-- CreateEnum
CREATE TYPE "CashMovementConcept" AS ENUM ('PACK_CONTRACT', 'DROP_IN', 'REFUND');

-- CreateEnum
CREATE TYPE "RefundRequestStatus" AS ENUM ('PENDING', 'REJECTED', 'EXECUTED');

-- CreateEnum
CREATE TYPE "ReceiptConcept" AS ENUM ('PACK_CONTRACT', 'DROP_IN');

-- CreateEnum
CREATE TYPE "AccessCredentialStatus" AS ENUM ('ACTIVE', 'REVOKED');

-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mercadopago_accounts" (
    "tenant_id" UUID NOT NULL,
    "access_token_ciphertext" TEXT NOT NULL,
    "public_key" TEXT NOT NULL,
    "mp_user_id" TEXT,
    "last_validated_at" TIMESTAMP(3),
    "last_validation_ok" BOOLEAN,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mercadopago_accounts_pkey" PRIMARY KEY ("tenant_id")
);

-- CreateTable
CREATE TABLE "tenant_settings" (
    "tenant_id" UUID NOT NULL,
    "reservation_cancellation_hours" INTEGER NOT NULL DEFAULT 6,
    "waitlist_mode" "WaitlistMode" NOT NULL DEFAULT 'AUTO_ASSIGN',
    "allow_late_session_entry" BOOLEAN NOT NULL DEFAULT false,
    "debt_tolerance_days" INTEGER NOT NULL DEFAULT 15,
    "multi_entry_enabled" BOOLEAN NOT NULL DEFAULT false,
    "multi_entry_max_per_day" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_settings_pkey" PRIMARY KEY ("tenant_id")
);

-- CreateTable
CREATE TABLE "branches" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "super_users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "super_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_users" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT,
    "image_url" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "members" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "document" TEXT,
    "image_url" TEXT,
    "branch_id" UUID,
    "status" "MemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "profile_type" "AuthProfileType" NOT NULL,
    "super_user_id" UUID,
    "staff_user_id" UUID,
    "member_id" UUID,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "dangerous" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "staff_user_roles" (
    "staff_user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,

    CONSTRAINT "staff_user_roles_pkey" PRIMARY KEY ("staff_user_id","role_id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "type" "ServiceType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "image_url" TEXT,
    "drop_in_price" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "branch_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packs" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "image_url" TEXT,
    "price" INTEGER NOT NULL,
    "billing_period" "BillingPeriod" NOT NULL,
    "credits_expire_at" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "kuatia_configuration_id" TEXT,
    "kuatia_vct" TEXT,
    "kuatia_synced_at" TIMESTAMP(3),
    "kuatia_last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "packs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pack_components" (
    "id" UUID NOT NULL,
    "pack_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "credit_amount" INTEGER,

    CONSTRAINT "pack_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_recurrence_rules" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "instructor_id" UUID,
    "weekdays" "Weekday"[],
    "local_start_time" TEXT NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "timezone" TEXT NOT NULL,
    "starts_on" DATE NOT NULL,
    "ends_on" DATE NOT NULL,
    "capacity" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_recurrence_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "instructor_id" UUID,
    "recurrence_rule_id" UUID,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "capacity" INTEGER NOT NULL,
    "booked_count" INTEGER NOT NULL DEFAULT 0,
    "status" "SessionStatus" NOT NULL DEFAULT 'PUBLISHED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction_items" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "pack_id" UUID,
    "session_id" UUID,
    "transaction_id" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "PaymentStatus" NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "mp_preference_id" TEXT,
    "mp_payment_id" TEXT,
    "mp_init_point" TEXT,
    "mp_sandbox_init_point" TEXT,
    "refunded_at" TIMESTAMP(3),
    "refund_reason" TEXT,
    "mp_refund_manual_pending" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transaction_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "PaymentStatus" NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "mp_preference_id" TEXT,
    "mp_payment_id" TEXT,
    "mp_init_point" TEXT,
    "mp_sandbox_init_point" TEXT,
    "refunded_amount" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "pack_id" UUID NOT NULL,
    "transaction_item_id" UUID NOT NULL,
    "status" "ContractStatus" NOT NULL DEFAULT 'ACTIVE',
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3),
    "has_access_libre" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_credit_balances" (
    "id" UUID NOT NULL,
    "contract_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "initial_amount" INTEGER NOT NULL,
    "remaining" INTEGER NOT NULL,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contract_credit_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credential_offers" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "pack_id" UUID NOT NULL,
    "contract_id" UUID NOT NULL,
    "status" "CredentialOfferStatus" NOT NULL DEFAULT 'PENDING',
    "offer_uri" TEXT,
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credential_offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservations" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "contract_id" UUID,
    "credit_balance_id" UUID,
    "transaction_item_id" UUID,
    "status" "ReservationStatus" NOT NULL DEFAULT 'CONFIRMED',
    "coverage" "ReservationCoverage" NOT NULL DEFAULT 'CREDIT',
    "checked_in_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waitlist_entries" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "status" "WaitlistStatus" NOT NULL DEFAULT 'WAITING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "waitlist_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_movements" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "business_date" DATE NOT NULL,
    "transaction_item_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "recorded_by_staff_id" UUID,
    "amount" INTEGER NOT NULL,
    "kind" "CashMovementKind" NOT NULL DEFAULT 'INCOME',
    "concept" "CashMovementConcept" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "access_credentials" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "credential_ref" TEXT NOT NULL,
    "status" "AccessCredentialStatus" NOT NULL DEFAULT 'ACTIVE',
    "provider" TEXT NOT NULL DEFAULT 'stub',
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "access_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "access_attempts" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "member_id" UUID,
    "subject_staff_id" UUID,
    "credential_ref" TEXT,
    "result" "AccessAttemptResult" NOT NULL,
    "reason_code" TEXT NOT NULL,
    "scan_mode" TEXT NOT NULL,
    "reservation_id" UUID,
    "session_id" UUID,
    "manual_pass" BOOLEAN NOT NULL DEFAULT false,
    "motive_code" TEXT,
    "note" TEXT,
    "actor_staff_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "access_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "refund_requests" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "transaction_item_id" UUID NOT NULL,
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

-- CreateTable
CREATE TABLE "receipt_sequences" (
    "tenant_id" UUID NOT NULL,
    "next_number" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "receipt_sequences_pkey" PRIMARY KEY ("tenant_id")
);

-- CreateTable
CREATE TABLE "receipts" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "transaction_item_id" UUID,
    "transaction_id" UUID,
    "member_id" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "concept" "ReceiptConcept" NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_reconciliations" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "business_date" DATE NOT NULL,
    "expected_amount" INTEGER NOT NULL,
    "declared_amount" INTEGER NOT NULL,
    "difference" INTEGER NOT NULL,
    "reconciled_by_staff_id" UUID,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_reconciliations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" UUID NOT NULL,
    "tenant_id" UUID,
    "actor_profile" "AuthProfileType" NOT NULL,
    "actor_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID,
    "before" JSONB,
    "after" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE INDEX "branches_tenant_id_idx" ON "branches"("tenant_id");

-- A lo sumo una sede default por tenant (S2 / RN-TEN-003).
CREATE UNIQUE INDEX "branches_one_default_per_tenant"
ON "branches" ("tenant_id")
WHERE "is_default" = true;

-- CreateIndex
CREATE UNIQUE INDEX "super_users_email_key" ON "super_users"("email");

-- CreateIndex
CREATE INDEX "staff_users_tenant_id_idx" ON "staff_users"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "staff_users_tenant_id_email_key" ON "staff_users"("tenant_id", "email");

-- CreateIndex
CREATE INDEX "members_tenant_id_idx" ON "members"("tenant_id");

-- CreateIndex
CREATE INDEX "members_branch_id_idx" ON "members"("branch_id");

-- CreateIndex
CREATE UNIQUE INDEX "members_tenant_id_email_key" ON "members"("tenant_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "members_tenant_id_document_key" ON "members"("tenant_id", "document");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_super_user_id_idx" ON "refresh_tokens"("super_user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_staff_user_id_idx" ON "refresh_tokens"("staff_user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_member_id_idx" ON "refresh_tokens"("member_id");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

-- CreateIndex
CREATE INDEX "roles_tenant_id_idx" ON "roles"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "roles_tenant_id_slug_key" ON "roles"("tenant_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "roles_tenant_id_name_key" ON "roles"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "role_permissions_permission_id_idx" ON "role_permissions"("permission_id");

-- CreateIndex
CREATE INDEX "staff_user_roles_role_id_idx" ON "staff_user_roles"("role_id");

-- CreateIndex
CREATE INDEX "services_tenant_id_idx" ON "services"("tenant_id");

-- CreateIndex
CREATE INDEX "services_tenant_id_type_idx" ON "services"("tenant_id", "type");

-- CreateIndex
CREATE INDEX "services_branch_id_idx" ON "services"("branch_id");

-- CreateIndex
CREATE INDEX "packs_tenant_id_idx" ON "packs"("tenant_id");

-- CreateIndex
CREATE INDEX "pack_components_service_id_idx" ON "pack_components"("service_id");

-- CreateIndex
CREATE UNIQUE INDEX "pack_components_pack_id_service_id_key" ON "pack_components"("pack_id", "service_id");

-- CreateIndex
CREATE INDEX "session_recurrence_rules_tenant_id_idx" ON "session_recurrence_rules"("tenant_id");

-- CreateIndex
CREATE INDEX "session_recurrence_rules_service_id_idx" ON "session_recurrence_rules"("service_id");

-- CreateIndex
CREATE INDEX "session_recurrence_rules_branch_id_idx" ON "session_recurrence_rules"("branch_id");

-- CreateIndex
CREATE INDEX "session_recurrence_rules_instructor_id_idx" ON "session_recurrence_rules"("instructor_id");

-- CreateIndex
CREATE INDEX "sessions_tenant_id_idx" ON "sessions"("tenant_id");

-- CreateIndex
CREATE INDEX "sessions_tenant_id_starts_at_idx" ON "sessions"("tenant_id", "starts_at");

-- CreateIndex
CREATE INDEX "sessions_service_id_idx" ON "sessions"("service_id");

-- CreateIndex
CREATE INDEX "sessions_branch_id_idx" ON "sessions"("branch_id");

-- CreateIndex
CREATE INDEX "sessions_instructor_id_idx" ON "sessions"("instructor_id");

-- CreateIndex
CREATE INDEX "sessions_recurrence_rule_id_idx" ON "sessions"("recurrence_rule_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_recurrence_rule_id_starts_at_key" ON "sessions"("recurrence_rule_id", "starts_at");

-- CreateIndex
CREATE UNIQUE INDEX "transaction_items_mp_payment_id_key" ON "transaction_items"("mp_payment_id");

-- CreateIndex
CREATE INDEX "transaction_items_tenant_id_idx" ON "transaction_items"("tenant_id");

-- CreateIndex
CREATE INDEX "transaction_items_member_id_idx" ON "transaction_items"("member_id");

-- CreateIndex
CREATE INDEX "transaction_items_session_id_idx" ON "transaction_items"("session_id");

-- CreateIndex
CREATE INDEX "transaction_items_transaction_id_idx" ON "transaction_items"("transaction_id");

-- CreateIndex
CREATE INDEX "transaction_items_mp_preference_id_idx" ON "transaction_items"("mp_preference_id");

-- CreateIndex
CREATE UNIQUE INDEX "transaction_items_tenant_id_idempotency_key_key" ON "transaction_items"("tenant_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "transactions_tenant_id_idx" ON "transactions"("tenant_id");

-- CreateIndex
CREATE INDEX "transactions_member_id_idx" ON "transactions"("member_id");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_tenant_id_idempotency_key_key" ON "transactions"("tenant_id", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "contracts_transaction_item_id_key" ON "contracts"("transaction_item_id");

-- CreateIndex
CREATE INDEX "contracts_tenant_id_idx" ON "contracts"("tenant_id");

-- CreateIndex
CREATE INDEX "contracts_member_id_idx" ON "contracts"("member_id");

-- CreateIndex
CREATE INDEX "contracts_pack_id_idx" ON "contracts"("pack_id");

-- CreateIndex
CREATE INDEX "contract_credit_balances_service_id_idx" ON "contract_credit_balances"("service_id");

-- CreateIndex
CREATE UNIQUE INDEX "contract_credit_balances_contract_id_service_id_key" ON "contract_credit_balances"("contract_id", "service_id");

-- CreateIndex
CREATE UNIQUE INDEX "credential_offers_contract_id_key" ON "credential_offers"("contract_id");

-- CreateIndex
CREATE INDEX "credential_offers_tenant_id_idx" ON "credential_offers"("tenant_id");

-- CreateIndex
CREATE INDEX "credential_offers_member_id_idx" ON "credential_offers"("member_id");

-- CreateIndex
CREATE INDEX "credential_offers_status_idx" ON "credential_offers"("status");

-- CreateIndex
CREATE UNIQUE INDEX "reservations_transaction_item_id_key" ON "reservations"("transaction_item_id");

-- CreateIndex
CREATE INDEX "reservations_tenant_id_idx" ON "reservations"("tenant_id");

-- CreateIndex
CREATE INDEX "reservations_member_id_idx" ON "reservations"("member_id");

-- CreateIndex
CREATE INDEX "reservations_session_id_idx" ON "reservations"("session_id");

-- CreateIndex
CREATE INDEX "reservations_contract_id_idx" ON "reservations"("contract_id");

-- CreateIndex
CREATE INDEX "reservations_credit_balance_id_idx" ON "reservations"("credit_balance_id");

-- Un afiliado no puede tener dos reservas CONFIRMED en la misma sesión.
CREATE UNIQUE INDEX "reservations_session_member_confirmed_uidx"
ON "reservations"("session_id", "member_id")
WHERE "status" = 'CONFIRMED';

-- CreateIndex
CREATE INDEX "waitlist_entries_tenant_id_idx" ON "waitlist_entries"("tenant_id");

-- CreateIndex
CREATE INDEX "waitlist_entries_session_id_status_created_at_idx" ON "waitlist_entries"("session_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "waitlist_entries_member_id_idx" ON "waitlist_entries"("member_id");

-- Un afiliado no puede estar dos veces WAITING en la misma sesión.
CREATE UNIQUE INDEX "waitlist_session_member_waiting_uidx"
ON "waitlist_entries"("session_id", "member_id")
WHERE "status" = 'WAITING';

-- CreateIndex
CREATE INDEX "cash_movements_tenant_id_business_date_idx" ON "cash_movements"("tenant_id", "business_date");

-- CreateIndex
CREATE INDEX "cash_movements_member_id_idx" ON "cash_movements"("member_id");

-- CreateIndex
CREATE UNIQUE INDEX "cash_movements_transaction_item_id_kind_key" ON "cash_movements"("transaction_item_id", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "access_credentials_credential_ref_key" ON "access_credentials"("credential_ref");

-- CreateIndex
CREATE INDEX "access_credentials_tenant_id_member_id_idx" ON "access_credentials"("tenant_id", "member_id");

-- CreateIndex
CREATE INDEX "access_credentials_member_id_status_idx" ON "access_credentials"("member_id", "status");

-- A lo sumo una credencial ACTIVE por afiliado.
CREATE UNIQUE INDEX "access_credentials_member_active_uidx"
ON "access_credentials"("member_id")
WHERE "status" = 'ACTIVE';

-- CreateIndex
CREATE INDEX "access_attempts_tenant_id_created_at_idx" ON "access_attempts"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "access_attempts_member_id_created_at_idx" ON "access_attempts"("member_id", "created_at");

-- CreateIndex
CREATE INDEX "access_attempts_subject_staff_id_created_at_idx" ON "access_attempts"("subject_staff_id", "created_at");

-- CreateIndex
CREATE INDEX "access_attempts_tenant_id_member_id_result_created_at_idx" ON "access_attempts"("tenant_id", "member_id", "result", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "staff_credential_offers_staff_user_id_key" ON "staff_credential_offers"("staff_user_id");

-- CreateIndex
CREATE INDEX "staff_credential_offers_tenant_id_idx" ON "staff_credential_offers"("tenant_id");

-- CreateIndex
CREATE INDEX "staff_credential_offers_status_idx" ON "staff_credential_offers"("status");

-- CreateIndex
CREATE INDEX "refund_requests_tenant_id_status_idx" ON "refund_requests"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "refund_requests_member_id_created_at_idx" ON "refund_requests"("member_id", "created_at");

-- CreateIndex
CREATE INDEX "refund_requests_transaction_item_id_idx" ON "refund_requests"("transaction_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "receipts_transaction_item_id_key" ON "receipts"("transaction_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "receipts_transaction_id_key" ON "receipts"("transaction_id");

-- CreateIndex
CREATE INDEX "receipts_tenant_id_idx" ON "receipts"("tenant_id");

-- CreateIndex
CREATE INDEX "receipts_transaction_id_idx" ON "receipts"("transaction_id");

-- CreateIndex
CREATE INDEX "receipts_member_id_created_at_idx" ON "receipts"("member_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "receipts_tenant_id_number_key" ON "receipts"("tenant_id", "number");

-- CreateIndex
CREATE INDEX "cash_reconciliations_tenant_id_business_date_idx" ON "cash_reconciliations"("tenant_id", "business_date");

-- CreateIndex
CREATE UNIQUE INDEX "cash_reconciliations_tenant_id_business_date_key" ON "cash_reconciliations"("tenant_id", "business_date");

-- CreateIndex
CREATE INDEX "audit_events_tenant_id_created_at_idx" ON "audit_events"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_events_entity_type_entity_id_idx" ON "audit_events"("entity_type", "entity_id");

-- AddForeignKey
ALTER TABLE "mercadopago_accounts" ADD CONSTRAINT "mercadopago_accounts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_settings" ADD CONSTRAINT "tenant_settings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_users" ADD CONSTRAINT "staff_users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_super_user_id_fkey" FOREIGN KEY ("super_user_id") REFERENCES "super_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_staff_user_id_fkey" FOREIGN KEY ("staff_user_id") REFERENCES "staff_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_user_roles" ADD CONSTRAINT "staff_user_roles_staff_user_id_fkey" FOREIGN KEY ("staff_user_id") REFERENCES "staff_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_user_roles" ADD CONSTRAINT "staff_user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packs" ADD CONSTRAINT "packs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pack_components" ADD CONSTRAINT "pack_components_pack_id_fkey" FOREIGN KEY ("pack_id") REFERENCES "packs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pack_components" ADD CONSTRAINT "pack_components_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_recurrence_rules" ADD CONSTRAINT "session_recurrence_rules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_recurrence_rules" ADD CONSTRAINT "session_recurrence_rules_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_recurrence_rules" ADD CONSTRAINT "session_recurrence_rules_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_recurrence_rules" ADD CONSTRAINT "session_recurrence_rules_instructor_id_fkey" FOREIGN KEY ("instructor_id") REFERENCES "staff_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_instructor_id_fkey" FOREIGN KEY ("instructor_id") REFERENCES "staff_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_recurrence_rule_id_fkey" FOREIGN KEY ("recurrence_rule_id") REFERENCES "session_recurrence_rules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_items" ADD CONSTRAINT "transaction_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_items" ADD CONSTRAINT "transaction_items_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_items" ADD CONSTRAINT "transaction_items_pack_id_fkey" FOREIGN KEY ("pack_id") REFERENCES "packs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_items" ADD CONSTRAINT "transaction_items_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_items" ADD CONSTRAINT "transaction_items_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_pack_id_fkey" FOREIGN KEY ("pack_id") REFERENCES "packs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_transaction_item_id_fkey" FOREIGN KEY ("transaction_item_id") REFERENCES "transaction_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_credit_balances" ADD CONSTRAINT "contract_credit_balances_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_credit_balances" ADD CONSTRAINT "contract_credit_balances_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credential_offers" ADD CONSTRAINT "credential_offers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credential_offers" ADD CONSTRAINT "credential_offers_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credential_offers" ADD CONSTRAINT "credential_offers_pack_id_fkey" FOREIGN KEY ("pack_id") REFERENCES "packs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credential_offers" ADD CONSTRAINT "credential_offers_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_credit_balance_id_fkey" FOREIGN KEY ("credit_balance_id") REFERENCES "contract_credit_balances"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_transaction_item_id_fkey" FOREIGN KEY ("transaction_item_id") REFERENCES "transaction_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_transaction_item_id_fkey" FOREIGN KEY ("transaction_item_id") REFERENCES "transaction_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_recorded_by_staff_id_fkey" FOREIGN KEY ("recorded_by_staff_id") REFERENCES "staff_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_credentials" ADD CONSTRAINT "access_credentials_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_credentials" ADD CONSTRAINT "access_credentials_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_attempts" ADD CONSTRAINT "access_attempts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_attempts" ADD CONSTRAINT "access_attempts_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_attempts" ADD CONSTRAINT "access_attempts_subject_staff_id_fkey" FOREIGN KEY ("subject_staff_id") REFERENCES "staff_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_attempts" ADD CONSTRAINT "access_attempts_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_attempts" ADD CONSTRAINT "access_attempts_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_attempts" ADD CONSTRAINT "access_attempts_actor_staff_id_fkey" FOREIGN KEY ("actor_staff_id") REFERENCES "staff_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_credential_offers" ADD CONSTRAINT "staff_credential_offers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_credential_offers" ADD CONSTRAINT "staff_credential_offers_staff_user_id_fkey" FOREIGN KEY ("staff_user_id") REFERENCES "staff_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_transaction_item_id_fkey" FOREIGN KEY ("transaction_item_id") REFERENCES "transaction_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_resolved_by_staff_id_fkey" FOREIGN KEY ("resolved_by_staff_id") REFERENCES "staff_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipt_sequences" ADD CONSTRAINT "receipt_sequences_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_transaction_item_id_fkey" FOREIGN KEY ("transaction_item_id") REFERENCES "transaction_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_reconciliations" ADD CONSTRAINT "cash_reconciliations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_reconciliations" ADD CONSTRAINT "cash_reconciliations_reconciled_by_staff_id_fkey" FOREIGN KEY ("reconciled_by_staff_id") REFERENCES "staff_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
