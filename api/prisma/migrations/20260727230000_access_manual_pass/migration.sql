-- Pase manual: motivo + nota en intentos de ingreso.

ALTER TABLE "access_attempts"
  ADD COLUMN "motive_code" TEXT,
  ADD COLUMN "note" TEXT;
