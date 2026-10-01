import { ExpenseMethod, ExpenseNature } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ListQueryDto } from '../../common/list';
import {
  EXPENSE_AMOUNT_MAX,
  EXPENSE_LABEL_NAME_MAX,
  EXPENSE_NOTE_MAX,
} from '../expenses.constants';

const YMD = /^\d{4}-\d{2}-\d{2}$/;

/** Alta de etiqueta de gasto. */
export class CreateExpenseLabelDto {
  @IsString()
  @MinLength(1)
  @MaxLength(EXPENSE_LABEL_NAME_MAX)
  name!: string;
}

/** Renombrar o archivar/desarchivar una etiqueta. */
export class UpdateExpenseLabelDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(EXPENSE_LABEL_NAME_MAX)
  name?: string;

  @IsOptional()
  @IsBoolean()
  archived?: boolean;
}

/** Alta de gasto. Sin `businessDate` = hoy (BA). */
export class CreateExpenseDto {
  @IsOptional()
  @Matches(YMD, { message: 'businessDate must be YYYY-MM-DD' })
  businessDate?: string;

  @IsInt()
  @Min(1)
  @Max(EXPENSE_AMOUNT_MAX)
  amount!: number;

  @IsEnum(ExpenseNature)
  nature!: ExpenseNature;

  @IsEnum(ExpenseMethod)
  method!: ExpenseMethod;

  @IsUUID()
  labelId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(EXPENSE_NOTE_MAX)
  note?: string;
}

/** Edición parcial de gasto. `note: ''` la borra. */
export class UpdateExpenseDto {
  @IsOptional()
  @Matches(YMD, { message: 'businessDate must be YYYY-MM-DD' })
  businessDate?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(EXPENSE_AMOUNT_MAX)
  amount?: number;

  @IsOptional()
  @IsEnum(ExpenseNature)
  nature?: ExpenseNature;

  @IsOptional()
  @IsEnum(ExpenseMethod)
  method?: ExpenseMethod;

  @IsOptional()
  @IsUUID()
  labelId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(EXPENSE_NOTE_MAX)
  note?: string;
}

/** Listado de gastos. Sin fechas = mes calendario actual (BA). */
export class ListExpensesQueryDto extends ListQueryDto {
  @IsOptional()
  @Matches(YMD, { message: 'from must be YYYY-MM-DD' })
  from?: string;

  @IsOptional()
  @Matches(YMD, { message: 'to must be YYYY-MM-DD' })
  to?: string;

  @IsOptional()
  @IsUUID()
  labelId?: string;

  @IsOptional()
  @IsEnum(ExpenseNature)
  nature?: ExpenseNature;

  @IsOptional()
  @IsEnum(ExpenseMethod)
  method?: ExpenseMethod;
}

/** Período del resumen. Sin fechas = mes calendario actual (BA). */
export class ExpensesSummaryQueryDto {
  @IsOptional()
  @Matches(YMD, { message: 'from must be YYYY-MM-DD' })
  from?: string;

  @IsOptional()
  @Matches(YMD, { message: 'to must be YYYY-MM-DD' })
  to?: string;
}

/** Etiquetas: incluir archivadas (pantalla de administración). */
export class ListExpenseLabelsQueryDto {
  @IsOptional()
  @Type(() => String)
  @Matches(/^(true|false)$/)
  includeArchived?: string;
}
