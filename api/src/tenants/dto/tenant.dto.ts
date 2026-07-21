import { TenantStatus } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Alta de tenant + owner Admin (CU-ROL-001).
 */
export class CreateTenantDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

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
 * Edición parcial de tenant (nombre y/o status).
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
  @IsEnum(TenantStatus)
  status?: TenantStatus;
}
