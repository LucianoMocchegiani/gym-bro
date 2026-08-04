import { RefundRequestStatus } from '@prisma/client';
import {
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ListQueryDto } from '../../common/list';

/**
 * Solicitud de devolución del afiliado (CU-PAG-004).
 */
export class CreateRefundRequestDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason?: string;
}

/**
 * Ejecución de devolución por staff (CU-PAG-005 / CU-PAG-007).
 */
export class ExecuteRefundDto {
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;

  /** Motivo tipificado; `doble_cobro` = CU-PAG-007. */
  @IsOptional()
  @IsIn(['doble_cobro', 'solicitud', 'otro'])
  motiveCode?: 'doble_cobro' | 'solicitud' | 'otro';

  @IsOptional()
  @IsString()
  refundRequestId?: string;
}

/**
 * Query de listado de solicitudes de devolución (CU-PAG-004/005/007).
 *
 * @remarks Sin `q`. `orderBy` acepta `createdAt` (default).
 */
export class ListRefundRequestsQueryDto extends ListQueryDto {
  @IsOptional()
  @IsEnum(RefundRequestStatus)
  status?: RefundRequestStatus;
}
