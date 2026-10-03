-- Pack de plataforma sin mes de prueba (se cobra desde el primer ciclo).
ALTER TABLE "packs" ADD COLUMN "offers_platform_trial" BOOLEAN NOT NULL DEFAULT true;

-- Faciliter Brain Basic de prueba (100 ARS): para validar el cobro real.
UPDATE "packs" SET "offers_platform_trial" = false
WHERE "id" = '00000000-0000-4000-8000-000000000016';
