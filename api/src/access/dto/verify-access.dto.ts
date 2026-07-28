import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Body de verificación de ingreso en puerta (CU-ACC-001).
 */
export class VerifyAccessDto {
  @IsIn(['gym_scans_member', 'member_scans_gym'])
  mode!: 'gym_scans_member' | 'member_scans_gym';

  /** Token del afiliado (modo gym_scans_member; stub = credentialRef). */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  presentationToken?: string;

  /** QR del local (modo member_scans_gym; stub = stub-venue:{tenantId}). */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  venueToken?: string;

  /** Credencial del afiliado al escanear el local. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  credentialRef?: string;
}
