import { RefundRequestStatus } from '@prisma/client';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
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

/** Choice attached to the product transaction item being refunded. */
export class ProductRestockDecisionDto {
  @IsUUID('4')
  transactionItemId!: string;

  @IsBoolean()
  restock!: boolean;
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

  @IsOptional()
  @IsArray()
  @ArrayUnique(
    (decision: ProductRestockDecisionDto | null | undefined) =>
      decision?.transactionItemId,
  )
  @ValidateNested({ each: true })
  @Type(() => ProductRestockDecisionDto)
  productRestockDecisions?: ProductRestockDecisionDto[];
}

/**
 * Devolución de uno o más ítems de un cart (CU-PAG-005).
 *
 * @remarks Un confirm = un refund MP (suma) y un comprobante/egreso.
 */
export class ExecuteTransactionRefundDto extends ExecuteRefundDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  @Type(() => String)
  transactionItemIds!: string[];
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
