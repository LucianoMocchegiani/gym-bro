import { MemberImportKind } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  IMPORT_MAX_MATCH_KEYS,
  IMPORT_MAX_ROWS_PER_BATCH,
} from '../member-import.constants';

/**
 * Fila de la planilla ya mapeada por el Admin.
 *
 * @remarks Solo largo máximo acá: la validación de negocio va por fila en el
 * servicio, así una fila mala no tumba el lote entero.
 */
export class ImportRowDto {
  @IsInt()
  @Min(1)
  rowNumber!: number;

  @IsOptional()
  @IsString()
  @MaxLength(320)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  document?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  status?: string;
}

/** Lote de filas (vista previa o alta). */
export class ImportRowsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(IMPORT_MAX_ROWS_PER_BATCH)
  @ValidateNested({ each: true })
  @Type(() => ImportRowDto)
  rows!: ImportRowDto[];

  /** Sede fija para todo el lote (opcional). */
  @IsOptional()
  @IsUUID('4')
  branchId?: string;
}

/** Abre una corrida. */
export class StartImportDto {
  @IsEnum(MemberImportKind)
  kind!: MemberImportKind;

  @IsString()
  @MaxLength(200)
  filename!: string;

  @IsInt()
  @Min(0)
  totalRows!: number;

  /** Campo Faciliter → columna origen o valor fijo. */
  @IsOptional()
  @IsObject()
  mapping?: Record<string, unknown>;
}

/** DNI o mails sacados de los nombres de archivo del zip. */
export class MatchFilesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(IMPORT_MAX_MATCH_KEYS)
  @IsString({ each: true })
  @MaxLength(320, { each: true })
  keys!: string[];
}
