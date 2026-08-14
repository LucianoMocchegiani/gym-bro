/**
 * Puerto HTTP hacia Kuatia issuer/verifier (OID4VCI + OID4VP).
 *
 * @remarks Auth: `x-api-key`. Producto compartido GymBro.
 * @see https://kuatia.xyz/docs
 * @see docs/12-acceso-quark-oid4-diseno.md
 */

/**
 * Metadata OID4VCI a fusionar en el issuer (`PATCH …/records/metadata`).
 */
export type KuatiaIssuerMetadataPatch = {
  display?: Array<Record<string, unknown>>;
  credentialConfigurationsSupported?: Record<string, unknown>;
};

export type KuatiaPatchIssuerMetadataResult = {
  issuerId: string;
  recordType: string;
  record: Record<string, unknown>;
};

/**
 * Body de `POST /v1/issuers/:walletId/openid4vc/offer`.
 */
export type KuatiaCreateOfferInput = {
  credentialConfigurationId: string;
  vct: string;
  claims: Record<string, unknown>;
  claimsDisplay?: Record<string, { name: string; locale?: string }>;
  disclosureFrame?: { _sd?: string[] };
  preAuthorizedCode?: string;
};

export type KuatiaCreateOfferResult = {
  offerUri: string;
  issuanceSessionId: string;
};

/**
 * Body de `POST /v1/verifiers/:walletId/openid4vc/request`.
 */
export type KuatiaCreatePresentationRequestInput = {
  presentationDefinition?: Record<string, unknown>;
  dcqlQuery?: Record<string, unknown>;
  responseMode?: 'direct_post' | 'direct_post.jwt';
  requestSignerMethod?: 'did' | 'none' | 'x5c';
};

export type KuatiaCreatePresentationRequestResult = {
  requestUri: string;
  verificationSessionId: string;
};

/**
 * Vista de sesión OID4VP tras mapear el GET crudo de Kuatia.
 *
 * @remarks Kuatia no compacta claims. GymBro decodifica `vp_token`.
 * Sin `vp_token` → presentación aún no llegó (`presented=false`).
 */
export type KuatiaVerificationSession = {
  id: string;
  state: string;
  /** True si hay `authorizationResponsePayload.vp_token`. */
  presented: boolean;
  /** Claims revelados del SD-JWT (vacío si aún no presentó). */
  claims: Record<string, unknown>;
};

/**
 * Cliente hacia issuer/verifier Kuatia (producto compartido).
 */
export abstract class KuatiaAdminPort {
  /**
   * Merge de metadata OID4VCI (`PATCH /v1/issuers/:id/records/metadata`).
   */
  abstract patchIssuerMetadata(
    issuerWalletId: string,
    patch: KuatiaIssuerMetadataPatch,
  ): Promise<KuatiaPatchIssuerMetadataResult>;

  /**
   * Crea credential offer OID4VCI pre-authorized.
   */
  abstract createCredentialOffer(
    issuerWalletId: string,
    input: KuatiaCreateOfferInput,
  ): Promise<KuatiaCreateOfferResult>;

  /**
   * Crea authorization request OID4VP (`POST …/openid4vc/request`).
   */
  abstract createPresentationRequest(
    verifierWalletId: string,
    input: KuatiaCreatePresentationRequestInput,
  ): Promise<KuatiaCreatePresentationRequestResult>;

  /**
   * Estado de sesión OID4VP (`GET …/openid4vc/session/:id`).
   */
  abstract getVerificationSession(
    verifierWalletId: string,
    verificationSessionId: string,
  ): Promise<KuatiaVerificationSession>;
}
