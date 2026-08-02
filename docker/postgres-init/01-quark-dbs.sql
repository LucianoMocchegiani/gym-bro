-- Bases Quark (issuer / verifier). Solo corre en el primer init del volumen Postgres.
CREATE USER quarkid WITH PASSWORD 'quarkid';
CREATE DATABASE quarkid_issuer OWNER quarkid;
CREATE DATABASE quarkid_verifier OWNER quarkid;
GRANT ALL PRIVILEGES ON DATABASE quarkid_issuer TO quarkid;
GRANT ALL PRIVILEGES ON DATABASE quarkid_verifier TO quarkid;
