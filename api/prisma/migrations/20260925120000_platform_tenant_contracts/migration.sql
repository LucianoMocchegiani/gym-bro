-- Venta de plataforma (Caja del tenant `admin`).
--
-- `member_id` pasa a nullable en todas las tablas que lo referencian: cuando es
-- null, el tenant del propio `tenant_id` abona (el gym paga un pack de la
-- plataforma, no un afiliado).
--
-- `contracts.contract_type` distingue MEMBER (afiliado del gym) de TENANT
-- (suscripción del gym a la plataforma).
--
-- El tipado de `debit_mandates` a TIMESTAMP(3) alinea la tabla con el schema
-- (deriva de columnas DateTime criadas fuera de migraciones).

-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('MEMBER', 'TENANT');

-- AlterTable
ALTER TABLE "cash_movements" ALTER COLUMN "member_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "contracts" ADD COLUMN     "contract_type" "ContractType" NOT NULL DEFAULT 'MEMBER',
ALTER COLUMN "member_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "debit_mandates" ALTER COLUMN "last_charged_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "cancelled_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "receipts" ALTER COLUMN "member_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "transaction_items" ALTER COLUMN "member_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "transactions" ALTER COLUMN "member_id" DROP NOT NULL;
