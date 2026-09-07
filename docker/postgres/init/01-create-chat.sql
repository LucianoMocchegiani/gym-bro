-- Corre solo en el primer boot del volumen Postgres.
-- Volúmenes ya existentes: chat-api `ensure-db.ts` crea `chat` si falta.
CREATE DATABASE chat;
