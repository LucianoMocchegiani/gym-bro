-- Afiliado aceptó el offer en wallet (OID4VCI); bandeja deja de listarlo como PENDING.
ALTER TYPE "CredentialOfferStatus" ADD VALUE IF NOT EXISTS 'ACCEPTED';
