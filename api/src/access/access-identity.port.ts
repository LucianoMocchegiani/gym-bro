/**
 * Modos de escaneo soportados por el contrato del puerto (RN-ACC-003).
 *
 * @remarks El MVP de UI/`POST /access/verify` puede exponer solo uno;
 * el puerto ya acepta ambos.
 */
export type AccessScanMode = 'gym_scans_member' | 'member_scans_gym';

/**
 * Input de resolución de presentación (QR / SSI).
 */
export type ResolvePresentationInput = {
  mode: AccessScanMode;
  /**
   * Token que presenta el afiliado (modo `gym_scans_member`).
   * En stub equivale a `credentialRef`.
   */
  presentationToken?: string;
  /**
   * Token/QR del local (modo `member_scans_gym`).
   * En stub: `stub-venue:{tenantId}`.
   */
  venueToken?: string;
  /**
   * Credencial del afiliado al escanear el local (modo `member_scans_gym`).
   * En stub se acepta también vía `presentationToken`.
   */
  credentialRef?: string;
};

/**
 * Identidad resuelta por el adapter (sin derechos de pack/deuda).
 */
export type ResolvedPresentation = {
  tenantId: string;
  afiliadoId: string;
  credentialRef: string;
};

/**
 * Input para emitir credencial de vínculo.
 */
export type IssueMembershipCredentialInput = {
  tenantId: string;
  memberId: string;
};

/**
 * Puerto de identidad de acceso (RN-ACC-001 / arquitectura §6).
 *
 * @remarks GymBro no mete packs ni deuda en la credencial (enfoque B).
 * `ACCESS_PROVIDER=stub` usa el adapter local; Quark/SSI es post-stub.
 */
export abstract class AccessIdentityProvider {
  /**
   * Resuelve una presentación a afiliado + tenant + ref de credencial.
   *
   * @throws Si el token es inválido, revocado o el venue no coincide.
   */
  abstract resolvePresentation(
    input: ResolvePresentationInput,
  ): Promise<ResolvedPresentation>;

  /**
   * Emite una nueva ref opaca de vínculo (sin persistir en el puerto).
   *
   * @remarks La persistencia ACTIVE/REVOKED vive en `access_credentials`.
   */
  abstract issueMembershipCredential(
    input: IssueMembershipCredentialInput,
  ): Promise<{ credentialRef: string; provider: string }>;

  /**
   * Notifica revocación al proveedor externo (stub = no-op).
   */
  abstract revokeCredential(credentialRef: string): Promise<void>;

  /**
   * Token de venue del tenant para modo `member_scans_gym` (stub).
   */
  abstract venueTokenForTenant(tenantId: string): string;
}

/** Token de inyección Nest para el adapter concreto. */
export const ACCESS_IDENTITY_PROVIDER = Symbol('ACCESS_IDENTITY_PROVIDER');
