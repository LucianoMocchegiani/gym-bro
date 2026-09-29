import { IsIn, IsOptional, IsUUID } from 'class-validator';
import { ListQueryDto } from '../../common/list';

/**
 * Filtro de la cola de débitos en Caja.
 */
export class ListDebitMandatesDto extends ListQueryDto {
  @IsOptional()
  @IsIn(['due', 'pending', 'retrying', 'failed', 'all'])
  bucket?: 'due' | 'pending' | 'retrying' | 'failed' | 'all';

  @IsOptional()
  @IsUUID()
  memberId?: string;
}
