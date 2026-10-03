import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

/**
 * Alta de mandato: suscripción MP (`init_point`), sin tarjeta (CU-PAG-008).
 */
export class EnrollDebitMandateDto {
  @IsUUID()
  packId!: string;

  /** true = primer cobro al autorizar; false = `start_date` = vencimiento vigente. */
  @IsBoolean()
  chargeNow!: boolean;

  /** Mail de la cuenta MP que autoriza. Vacío = el del mandato o el del afiliado. */
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  payerEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  idempotencyKey?: string;
}
