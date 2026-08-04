import { Weekday } from '@prisma/client';
import {
  ArrayNotEmpty,
  ArrayUnique,
  Equals,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { ListQueryDto } from '../../common/list';

/**
 * Alta de regla semanal que materializa sesiones (CU-SER-004).
 */
export class CreateRecurrenceRuleDto {
  @IsUUID('4')
  serviceId!: string;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsEnum(Weekday, { each: true })
  weekdays!: Weekday[];

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  localStartTime!: string;

  @IsInt()
  @Min(1)
  @Max(1440)
  durationMinutes!: number;

  @IsString()
  timezone!: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  startsOn!: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  endsOn!: string;

  @IsInt()
  @Min(1)
  capacity!: number;

  @IsOptional()
  @IsUUID('4')
  instructorId?: string;

  @IsOptional()
  @IsUUID('4')
  branchId?: string;
}

/**
 * Desactivación de regla sin alterar sesiones ya materializadas.
 */
export class DeactivateRecurrenceRuleDto {
  @Equals(false)
  active!: false;
}

/**
 * Query de listado de reglas de recurrencia (CU-SER-004).
 *
 * @remarks Sin `q`. `orderBy` acepta `createdAt` (default).
 */
export class ListRecurrenceRulesQueryDto extends ListQueryDto {}
