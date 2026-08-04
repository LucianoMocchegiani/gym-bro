import { TenantStatus } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ListQueryDto } from '../../common/list';

/**
 * Alta de tenant + owner Admin (CU-ROL-001).
 */
export class CreateTenantDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  /** Slug URL-safe único (subdominio). */
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug!: string;

  @IsEmail()
  ownerEmail!: string;

  @IsString()
  @MinLength(8)
  ownerPassword!: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  ownerName?: string;
}

/**
 * Edición parcial de tenant (nombre, slug y/o status).
 *
 * @remarks RN-TEN-002 / CU-ROL-002: `status` SUSPENDED | ACTIVE (idempotente).
 */
export class UpdateTenantDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug?: string;

  @IsOptional()
  @IsEnum(TenantStatus)
  status?: TenantStatus;
}

/**
 * Query de listado de tenants (Super Admin).
 *
 * @remarks `q` busca en name y slug. `orderBy` acepta `createdAt`, `name`
 * y `slug`.
 */
export class ListTenantsQueryDto extends ListQueryDto {
  @IsOptional()
  @IsEnum(TenantStatus)
  status?: TenantStatus;
}
