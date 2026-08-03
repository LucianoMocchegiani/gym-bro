-- Quark OID4VCI configuration refs on packs (soft-fail sync).
ALTER TABLE "packs"
  ADD COLUMN "quark_configuration_id" TEXT,
  ADD COLUMN "quark_vct" TEXT,
  ADD COLUMN "quark_synced_at" TIMESTAMP(3),
  ADD COLUMN "quark_last_error" TEXT;
