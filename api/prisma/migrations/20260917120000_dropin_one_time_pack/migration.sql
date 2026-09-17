-- Drop-in = pack ONE_TIME espejo del servicio; una VC por afiliado+pack.

ALTER TABLE "packs" ADD COLUMN "origin_service_id" UUID;

CREATE UNIQUE INDEX "packs_origin_service_id_key" ON "packs"("origin_service_id");

ALTER TABLE "packs" ADD CONSTRAINT "packs_origin_service_id_fkey" FOREIGN KEY ("origin_service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

DELETE FROM "credential_offers" AS a
USING "credential_offers" AS b
WHERE a."member_id" = b."member_id"
  AND a."pack_id" = b."pack_id"
  AND a."id" <> b."id"
  AND (
    a."created_at" < b."created_at"
    OR (a."created_at" = b."created_at" AND a."id" < b."id")
  );

DROP INDEX "credential_offers_contract_id_key";

CREATE UNIQUE INDEX "credential_offers_member_id_pack_id_key" ON "credential_offers"("member_id", "pack_id");

CREATE INDEX "credential_offers_contract_id_idx" ON "credential_offers"("contract_id");
