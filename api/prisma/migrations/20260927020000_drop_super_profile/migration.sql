-- La plataforma pasa a ser el tenant `admin` (Staff con rol `super-admin`).
-- Ya no existe un perfil `SUPER` aparte ni el host apex.
--
-- Orden importante: se borran los refresh tokens de SUPER antes de la tabla,
-- porque `refresh_tokens.super_user_id` es FK a `super_users`.

-- Refresh tokens de perfil SUPER (columna que se elimina abajo).
DELETE FROM "refresh_tokens" WHERE "profile_type" = 'SUPER';

-- Acciones de auditoría hechas por un SUPER (el actorId apunta a super_users,
-- que se borra después; sin este delete el cast a enum fallaría).
DELETE FROM "audit_events" WHERE "actor_profile" = 'SUPER';

-- Se reenumera `AuthProfileType` sin SUPER. PostgreSQL no permite quitar un
-- valor de un enum en sitio, asi que se recrea el tipo preservando las filas.
ALTER TYPE "AuthProfileType" RENAME TO "AuthProfileType_old";

CREATE TYPE "AuthProfileType" AS ENUM ('STAFF', 'MEMBER', 'IDENTITY');

-- Las dos columnas que usan el enum (refresh_tokens y audit_events).
ALTER TABLE "refresh_tokens"
  ALTER COLUMN "profile_type" TYPE "AuthProfileType"
  USING ("profile_type"::text::"AuthProfileType");

ALTER TABLE "audit_events"
  ALTER COLUMN "actor_profile" TYPE "AuthProfileType"
  USING ("actor_profile"::text::"AuthProfileType");

DROP TYPE "AuthProfileType_old";

-- FK + columna de SuperUser.
ALTER TABLE "refresh_tokens" DROP COLUMN "super_user_id";
DROP INDEX IF EXISTS "refresh_tokens_super_user_id_idx";
DROP TABLE IF EXISTS "super_users";
