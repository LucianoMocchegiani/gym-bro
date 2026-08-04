import { BillingPeriod } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { ListQueryDto } from '../../common/list';

/** Convierte `"true"`/`"false"` de query string a boolean. */
function toBoolean({ value }: { value: unknown }): unknown {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}

/**
 * Componente de pack en create/update.
 */
export class PackComponentInputDto {
  @IsUUID('4')
  serviceId!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  creditAmount?: number;
}

/**
 * Alta de pack con componentes anidados (CU-SER-002).
 */
export class CreatePackDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsInt()
  @Min(0)
  price!: number;

  @IsEnum(BillingPeriod)
  billingPeriod!: BillingPeriod;

  @IsOptional()
  @IsDateString()
  creditsExpireAt?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PackComponentInputDto)
  components!: PackComponentInputDto[];
}

/**
 * Edición de pack. Si viene `components`, reemplaza el set completo.
 */
export class UpdatePackDto {
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
  @IsInt()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsEnum(BillingPeriod)
  billingPeriod?: BillingPeriod;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsDateString()
  creditsExpireAt?: string | null;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PackComponentInputDto)
  components?: PackComponentInputDto[];
}

/**
 * Query de listado de packs del catálogo (CU-SER-002).
 *
 * @remarks `q` busca en name (contains, case-insensitive). `orderBy` acepta
 * `createdAt`, `name` y `price`.
 */
export class ListPacksQueryDto extends ListQueryDto {
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  active?: boolean;
}
