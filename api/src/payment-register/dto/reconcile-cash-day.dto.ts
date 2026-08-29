import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/**
 * Arqueo de caja del día (CU-PAG-003).
 *
 * @remarks `date` opcional = hoy en timezone BA. Un arqueo por día.
 */
export class ReconcileCashDayDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date must be YYYY-MM-DD',
  })
  date?: string;

  /** Efectivo contado (ARS enteros). */
  @Type(() => Number)
  @IsInt()
  @Min(0)
  declaredAmount!: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  note?: string;
}
