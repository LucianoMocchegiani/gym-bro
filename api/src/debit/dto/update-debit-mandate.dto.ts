import { IsEmail, IsOptional, IsUUID, MaxLength } from 'class-validator';

/**
 * Cambia el pack del próximo débito (RN-PAG-016).
 */
export class UpdateDebitMandateDto {
  @IsUUID()
  packId!: string;

  /** Mail de la cuenta MP que autoriza. Vacío = el del mandato o el del afiliado. */
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  payerEmail?: string;
}
