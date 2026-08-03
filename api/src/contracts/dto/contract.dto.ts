import { ContractStatus, PaymentMethod } from '@prisma/client';
import {
  Equals,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Alta de contratación con pago stub/caja aprobado (CU-CON-001 / RN-CON-004).
 *
 * @remarks Fechas opcionales: MONTHLY solo `startsAt` (`endsAt` = +1 mes);
 * ONE_TIME `startsAt` y/o `endsAt`. Sin fechas → defaults de apilado / +1 mes.
 */
export class CreateContractDto {
  @IsUUID('4')
  packId!: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  method?: PaymentMethod;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(120)
  idempotencyKey?: string;

  /** Inicio de vigencia (ISO). MONTHLY y ONE_TIME. */
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  /** Fin de vigencia (ISO). Solo ONE_TIME; en MONTHLY se rechaza. */
  @IsOptional()
  @IsDateString()
  endsAt?: string;
}

/**
 * Cancelación de contratación activa (CU-CON-002 / RN-SER-009).
 *
 * @remarks Solo `CANCELLED` en esta entrega. `REFUNDED` queda para E5.
 * `reason` es opcional y va a auditoría; no altera la lógica.
 */
export class UpdateContractStatusDto {
  @Equals(ContractStatus.CANCELLED)
  status!: 'CANCELLED';

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason?: string;
}
