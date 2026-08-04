import { AccessAttemptResult } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID, Matches } from 'class-validator';
import { ListQueryDto } from '../../common/list';

/**
 * Query de listado de intentos de acceso (CU-ACC-005).
 *
 * @remarks `q` busca en `memberId` es exacto vía filtro `memberId` (no free
 * text). `from`/`to` = YYYY-MM-DD (zona BA). `orderBy` fijo en `createdAt`.
 */
export class ListAccessAttemptsQueryDto extends ListQueryDto {
  @IsOptional()
  @IsUUID('4')
  memberId?: string;

  @IsOptional()
  @IsEnum(AccessAttemptResult)
  result?: AccessAttemptResult;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to?: string;
}
