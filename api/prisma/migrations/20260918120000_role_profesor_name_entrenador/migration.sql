-- Seed role + demo staff login: Entrenador (slug and email).
UPDATE "roles" SET "name" = 'Entrenador', "slug" = 'entrenador' WHERE "slug" = 'profesor';

UPDATE "staff_users"
SET "email" = 'entrenador@gymdeprueba.com'
WHERE "email" = 'profesor@gymdeprueba.com';
