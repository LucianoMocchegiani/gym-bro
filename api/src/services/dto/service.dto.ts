import { ServiceType } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { ListQueryDto } from '../../common/list';

/** Convierte `"true"`/`"false"` de query string a boolean. */
function toBoolean({ value }: { value: unknown }): unknown {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}

/**
 * Alta de servicio (CU-SER-001). El `type` no se cambia después.
 *
 * @remarks `dropInPrice` solo válido para `POR_SESIONES` (RN-SER-006).
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
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(500)
  imageUrl?: string | null;

  @IsOptional()
  @IsUUID('4')
  branchId?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  /** Precio drop-in ARS; omitir o null = drop-in deshabilitado. */
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(1)
  dropInPrice?: number | null;
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
  @IsString()
  @MaxLength(500)
  imageUrl?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID('4')
  branchId?: string | null;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(1)
  dropInPrice?: number | null;
}

/**
 * Query de listado de servicios del catálogo (CU-SER-001).
 *
 * @remarks `q` busca en name (contains, case-insensitive). `orderBy` acepta
 * `createdAt`, `name` y `type`.
 */
export class ListServicesQueryDto extends ListQueryDto {
  @IsOptional()
  @IsEnum(ServiceType)
  type?: ServiceType;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  active?: boolean;
}
