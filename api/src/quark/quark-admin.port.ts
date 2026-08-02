/**
 * Puerto HTTP hacia Quark issuer/verifier (OID4 alta de wallets).
 *
 * @remarks Solo provisioning de gym (spike). Emisión VC / OID4VP vienen después.
 * @see docs/12-acceso-quark-oid4-diseno.md
 */
export type QuarkCreateIssuerResult = {
  issuerId: string;
  tenantId: string;
  did: string | null;
  recordsCreated: string[];
};

export type QuarkCreateVerifierResult = {
  verifierId: string;
  tenantId: string;
  did: string | null;
  recordsCreated: string[];
};

export type QuarkIssuerListItem = {
  issuerId: string;
  tenantId: string;
  did: string | null;
};

export type QuarkVerifierListItem = {
  verifierId: string;
  tenantId: string;
  did: string | null;
};

/**
 * Cliente hacia los servicios Quark del Compose local.
 */
export abstract class QuarkAdminPort {
  /**
   * Alta de issuer (`POST /v1/issuers`).
   */
  abstract createIssuer(issuerId: string): Promise<QuarkCreateIssuerResult>;

  /**
   * Alta de verifier (`POST /v1/verifiers`).
   */
  abstract createVerifier(
    verifierId: string,
  ): Promise<QuarkCreateVerifierResult>;

  /**
   * Lista issuers (`GET /v1/issuers`) — útil si ya existía (409 → reconciliar).
   */
  abstract listIssuers(): Promise<QuarkIssuerListItem[]>;

  /**
   * Lista verifiers (`GET /v1/verifiers`).
   */
  abstract listVerifiers(): Promise<QuarkVerifierListItem[]>;
}
