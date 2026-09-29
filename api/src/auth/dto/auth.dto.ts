import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

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
 * Credenciales de afiliado.
 *
 * @remarks Requiere `tenantId` **o** `tenantSlug` (RN-ROL-005: perfil separado).
 */
export class MemberLoginDto {
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

/**
 * Cambio de contraseña autenticado (staff / super).
 */
export class ChangePasswordDto {
  @IsString()
  @MinLength(8)
  currentPassword!: string;

  @IsString()
  @MinLength(8)
  newPassword!: string;
}

/**
 * Super Admin impersona a un staff member.
 */
export class ImpersonateDto {
  @IsUUID()
  tenantId!: string;

  @IsUUID()
  staffUserId!: string;
}

/**
 * Login de persona (sin gym). Email+password de `identities`.
 */
export class IdentityLoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

/**
 * Alta de cuenta Faciliter (apex / self-serve).
 */
export class IdentityRegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;
}

/**
 * Elige membresía y emite JWT de negocio (MEMBER o STAFF + tenantId).
 */
export class SelectContextDto {
  @IsUUID()
  tenantId!: string;

  @IsIn(['MEMBER', 'STAFF'])
  profile!: 'MEMBER' | 'STAFF';
}

/**
 * `id_token` de Google Sign-In (app).
 */
export class GoogleLoginDto {
  @IsString()
  @MinLength(20)
  idToken!: string;
}

/**
 * `id_token` de Sign in with Apple (app).
 */
export class AppleLoginDto {
  @IsString()
  @MinLength(20)
  idToken!: string;
}

/**
 * `id_token` de Google Sign-In para staff de un tenant (Admin web).
 */
export class StaffGoogleLoginDto {
  @IsString()
  @MinLength(20)
  idToken!: string;
}

/**
 * Canje de cookie `central_session` del login proxy.
 *
 * @remarks Sin `tenantSlug` emite JWT Identity (apex). Con slug, STAFF o MEMBER del gym.
 */
export class FromCookieDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  tenantSlug?: string;
}
