-- Pass de persona solo en identities.
ALTER TABLE "staff_users" DROP COLUMN "password_hash";
ALTER TABLE "members" DROP COLUMN "password_hash";
