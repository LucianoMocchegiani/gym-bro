/**
 * Puerto HTTP hacia Quark issuer/verifier (OID4 alta de wallets + metadata).
 *
 * @remarks Emisión VC / OID4VP vienen después.
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
 * Metadata OID4VCI a fusionar en el issuer (`PATCH …/records/metadata`).
 */
export type QuarkIssuerMetadataPatch = {
  display?: Array<Record<string, unknown>>;
  credentialConfigurationsSupported?: Record<string, unknown>;
};

export type QuarkPatchIssuerMetadataResult = {
  issuerId: string;
  recordType: string;
  record: Record<string, unknown>;
};

/**
 * Body de `POST /v1/issuers/:walletId/openid4vc/offer`.
 */
export type QuarkCreateOfferInput = {
  credentialConfigurationId: string;
  vct: string;
  claims: Record<string, unknown>;
  claimsDisplay?: Record<string, { name: string; locale?: string }>;
  disclosureFrame?: { _sd?: string[] };
  preAuthorizedCode?: string;
};

export type QuarkCreateOfferResult = {
  offerUri: string;
  issuanceSessionId: string;
};

/**
 * Cliente hacia los servicios Quark del Compose local.
 */
export abstract class QuarkAdminPort {
  /**
   * Alta de issuer (`POST /v1/issuers`).
   *
   * @param oid4vc - Si se envía, materializa `OpenId4VcIssuerRecord` (necesario para PATCH metadata).
   */
  abstract createIssuer(
    issuerId: string,
    oid4vc?: QuarkIssuerMetadataPatch,
  ): Promise<QuarkCreateIssuerResult>;

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

  /**
   * Merge de metadata OID4VCI (`PATCH /v1/issuers/:id/records/metadata`).
   */
  abstract patchIssuerMetadata(
    issuerWalletId: string,
    patch: QuarkIssuerMetadataPatch,
  ): Promise<QuarkPatchIssuerMetadataResult>;

  /**
   * Lista records Credo por tipo (`GET /v1/issuers/:id/records?type=`).
   */
  abstract listIssuerRecords(
    issuerWalletId: string,
    type: string,
  ): Promise<{ total: number }>;

  /**
   * Crea credential offer OID4VCI pre-authorized.
   */
  abstract createCredentialOffer(
    issuerWalletId: string,
    input: QuarkCreateOfferInput,
  ): Promise<QuarkCreateOfferResult>;
}
