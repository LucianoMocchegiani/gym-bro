import { ContractStatus, PaymentMethod } from '@prisma/client';
import {
  Equals,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Alta de contratación con pago stub/caja aprobado (CU-CON-001).
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
