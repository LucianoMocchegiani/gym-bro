import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Alta de mandato: cobro del mes o solo autorización de tarjeta (CU-PAG-008).
 */
export class EnrollDebitMandateDto {
  @IsUUID()
  packId!: string;

  /** Token de Card Payment Brick (nunca PAN). */
  @IsString()
  @MaxLength(256)
  cardToken!: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  paymentMethodId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  issuerId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(24)
  installments?: number;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  identificationType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  identificationNumber?: string;

  /** true = cobra el MONTHLY ahora; false = solo guarda la tarjeta. */
  @IsBoolean()
  chargeNow!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  idempotencyKey?: string;
}
