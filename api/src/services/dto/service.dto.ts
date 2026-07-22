import { ServiceType } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

/**
 * Alta de servicio (CU-SER-001). El `type` no se cambia después.
 */
export class CreateServiceDto {
  @IsEnum(ServiceType)
  type!: ServiceType;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsUUID('4')
  branchId?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

/**
 * Edición de ficha de servicio (sin cambiar `type`).
 */
export class UpdateServiceDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID('4')
  branchId?: string | null;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
