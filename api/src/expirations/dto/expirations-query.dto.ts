import { IsIn, IsOptional } from 'class-validator';

/**
 * Filtros de la cola de vencimientos MONTHLY.
 *
 * @remarks `view` = horizonte; `pay` = débito vs renovación a mano.
 */
export class ExpirationsQueryDto {
  @IsOptional()
  @IsIn(['all', 'upcoming', 'tolerance'])
  view?: 'all' | 'upcoming' | 'tolerance';

  @IsOptional()
  @IsIn(['all', 'debit', 'manual'])
  pay?: 'all' | 'debit' | 'manual';
}
