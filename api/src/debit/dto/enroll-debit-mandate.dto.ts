import { IsBoolean, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

/**
 * Alta de mandato: suscripción MP (`init_point`), sin tarjeta (CU-PAG-008).
 */
export class EnrollDebitMandateDto {
  @IsUUID()
  packId!: string;

  /** true = primer cobro al autorizar; false = `start_date` = vencimiento vigente. */
  @IsBoolean()
  chargeNow!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  idempotencyKey?: string;
}
