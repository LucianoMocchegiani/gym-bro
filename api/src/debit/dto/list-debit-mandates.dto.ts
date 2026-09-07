import { IsIn, IsOptional, IsUUID } from 'class-validator';
import { ListQueryDto } from '../../common/list';

/**
 * Filtro de la cola de débitos en Caja.
 */
export class ListDebitMandatesDto extends ListQueryDto {
  @IsOptional()
  @IsIn(['due', 'retrying', 'failed', 'all'])
  bucket?: 'due' | 'retrying' | 'failed' | 'all';

  @IsOptional()
  @IsUUID()
  memberId?: string;
}
