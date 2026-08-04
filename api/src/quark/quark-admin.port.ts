/**
 * Puerto HTTP hacia Quark issuer/verifier (OID4VCI + OID4VP).
 *
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
 * Metadata OID4VP inicial al crear verifier (`oid4vp.clientMetadata`).
 */
export type QuarkCreateVerifierOid4vp = {
  clientMetadata?: {
    client_name?: string;
    logo_uri?: string;
  };
};

/**
 * Body de `POST /v1/verifiers/:walletId/openid4vc/request`.
 */
export type QuarkCreatePresentationRequestInput = {
  presentationDefinition?: Record<string, unknown>;
  dcqlQuery?: Record<string, unknown>;
  responseMode?: 'direct_post' | 'direct_post.jwt';
  requestSignerMethod?: 'did' | 'none' | 'x5c';
};

export type QuarkCreatePresentationRequestResult = {
  requestUri: string;
  verificationSessionId: string;
};

/**
 * Vista de sesión OID4VP tras mapear el GET crudo de Quark.
 *
 * @remarks Quark no compacta claims. GymBro decodifica `vp_token` (script Postman 02.7).
 * Sin `vp_token` → presentación aún no llegó (`presented=false`).
 */
export type QuarkVerificationSession = {
  id: string;
  state: string;
  /** True si hay `authorizationResponsePayload.vp_token`. */
  presented: boolean;
  /** Claims revelados del SD-JWT (vacío si aún no presentó). */
  claims: Record<string, unknown>;
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
   *
   * @param oid4vp - Si se envía, materializa `OpenId4VcVerifierRecord` (necesario para OID4VP).
   */
  abstract createVerifier(
    verifierId: string,
    oid4vp?: QuarkCreateVerifierOid4vp,
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
   * Lista records Credo por tipo (`GET /v1/verifiers/:id/records?type=`).
   */
  abstract listVerifierRecords(
    verifierWalletId: string,
    type: string,
  ): Promise<{ total: number }>;

  /**
   * Crea credential offer OID4VCI pre-authorized.
   */
  abstract createCredentialOffer(
    issuerWalletId: string,
    input: QuarkCreateOfferInput,
  ): Promise<QuarkCreateOfferResult>;

  /**
   * Crea authorization request OID4VP (`POST …/openid4vc/request`).
   */
  abstract createPresentationRequest(
    verifierWalletId: string,
    input: QuarkCreatePresentationRequestInput,
  ): Promise<QuarkCreatePresentationRequestResult>;

  /**
   * Estado de sesión OID4VP (`GET …/openid4vc/session/:id`).
   */
  abstract getVerificationSession(
    verifierWalletId: string,
    verificationSessionId: string,
  ): Promise<QuarkVerificationSession>;
}
