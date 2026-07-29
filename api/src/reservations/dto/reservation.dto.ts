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
import { PaymentMethod } from '@prisma/client';

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
