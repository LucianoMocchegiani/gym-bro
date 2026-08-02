import { IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Check-in del afiliado al escanear el QR del local (CU-ACC-001 modo B).
 */
export class MemberCheckInDto {
  /** Token del QR mostrado en la puerta (`stub-venue:{tenantId}`). */
  @IsString()
  @MinLength(8)
  @MaxLength(200)
  venueToken!: string;
}
