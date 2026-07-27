import { AccessCredentialStatus } from '@prisma/client';

/**
 * Credencial de vínculo expuesta por la API.
 */
export type AccessCredentialDetail = {
  id: string;
  tenantId: string;
  memberId: string;
  credentialRef: string;
  status: AccessCredentialStatus;
  provider: string;
  issuedAt: Date;
  revokedAt: Date | null;
  /**
   * Token a mostrar/escanear en modo `gym_scans_member` (stub = credentialRef).
   */
  presentationToken: string;
  /**
   * QR del local para modo `member_scans_gym` (informativo; stub = stub-venue:{tenantId}).
   */
  venueToken: string;
};
