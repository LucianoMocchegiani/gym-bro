-- Postgres: el valor nuevo del enum no se puede usar en la misma transacción.
ALTER TYPE "DebitMandateStatus" ADD VALUE IF NOT EXISTS 'PENDING_CHECKOUT';
