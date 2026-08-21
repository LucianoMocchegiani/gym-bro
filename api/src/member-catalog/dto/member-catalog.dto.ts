import { IsOptional, IsString } from 'class-validator';
import { ListQueryDto } from '../../common/list';

/**
 * Query del listado de sesiones del afiliado (solo PUBLISHED y servicios
 * activos). Default: próximas (`from = ahora`, `order asc` por `startsAt`).
 */
export class MemberListSessionsQueryDto extends ListQueryDto {
  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;
}
