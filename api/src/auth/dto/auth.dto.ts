import {
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

/**
 * Credenciales de Super Admin (sin tenant).
 */
export class SuperLoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

/**
 * Credenciales de staff.
 *
 * @remarks Requiere `tenantId` **o** `tenantSlug` (email único por gym).
 */
export class StaffLoginDto {
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  tenantSlug?: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

/**
 * Credenciales de afiliado. Requiere `tenantId` (RN-ROL-005: perfil separado).
 */
export class MemberLoginDto {
  @IsUUID()
  tenantId!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

/**
 * Body para renovar el access token.
 */
export class RefreshTokenDto {
  @IsString()
  @MinLength(20)
  refreshToken!: string;
}

/**
 * Body para revocar un refresh token (logout).
 */
export class LogoutDto {
  @IsString()
  @MinLength(20)
  refreshToken!: string;
}
