import { TenantStatus } from '@prisma/client';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Alta de tenant por Super Admin (CU-ROL-001 parcial: solo entidad Tenant).
 */
export class CreateTenantDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;
}

/**
 * Edición parcial de tenant (nombre y/o status).
 *
 * @remarks RN-TEN-002 / CU-ROL-002: `status` SUSPENDED | ACTIVE (idempotente).
 * Al menos un campo es obligatorio (validado en el servicio).
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
