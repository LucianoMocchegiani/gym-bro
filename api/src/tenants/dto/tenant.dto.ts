import { IsString, MaxLength, MinLength } from 'class-validator';

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
 * Edición de nombre del tenant. El status (suspender) es otra tarea de E1.
 */
export class UpdateTenantDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;
}
