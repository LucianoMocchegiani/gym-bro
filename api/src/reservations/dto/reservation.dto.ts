import {
  Equals,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PaymentMethod, ReservationStatus } from '@prisma/client';
import { ListQueryDto } from '../../common/list';

/**
 * Alta de reserva con crédito o drop-in (CU-RES-001 / CU-RES-002).
 *
 * @remarks Default `coverage=CREDIT`. Drop-in (`DROP_IN`) es staff-only, crea
 * Payment APPROVED (stub/caja) con `idempotencyKey` y no consume créditos.
 * `method=MP` no aplica aquí: usar checkout MP drop-in.
 * `contractId` solo aplica a CREDIT.
 */
export class CreateReservationDto {
  @IsUUID('4')
  sessionId!: string;

  @IsOptional()
  @IsIn(['CREDIT', 'DROP_IN'])
  coverage?: 'CREDIT' | 'DROP_IN';

  @IsOptional()
  @IsUUID('4')
  contractId?: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  method?: PaymentMethod;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(120)
  idempotencyKey?: string;
}

/**
 * Cancelación de reserva (CU-RES-003).
 *
 * @remarks Solo `CANCELLED` en esta entrega.
 */
export class UpdateReservationStatusDto {
  @Equals('CANCELLED')
  status!: 'CANCELLED';
}

/**
 * Query de listado de reservas de un afiliado (CU-RES-001/002/003).
 *
 * @remarks Sin `q`. `orderBy` acepta `startsAt` (sesión) y `createdAt`.
 */
export class ListReservationsQueryDto extends ListQueryDto {
  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc' = 'asc';

  @IsOptional()
  @IsEnum(ReservationStatus)
  status?: ReservationStatus;
}
