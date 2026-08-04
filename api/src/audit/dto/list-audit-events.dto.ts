import { IsOptional, IsString } from 'class-validator';
import { ListQueryDto } from '../../common/list';

/**
 * Query de listado de auditoría (CU-ROL-007).
 *
 * @remarks `q` busca en `action` (contains, case-insensitive). `orderBy`
 * acepta `createdAt` (default, más recientes primero).
 */
export class ListAuditEventsQueryDto extends ListQueryDto {
  @IsOptional()
  @IsString()
  action?: string;
}
