-- Cuentas solo-Google no tienen password.
ALTER TABLE "identities" ALTER COLUMN "password_hash" DROP NOT NULL;
