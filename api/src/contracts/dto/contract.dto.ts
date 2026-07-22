import { PaymentMethod } from '@prisma/client';
import {
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
