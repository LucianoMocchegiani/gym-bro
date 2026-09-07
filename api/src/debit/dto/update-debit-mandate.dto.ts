import { IsUUID } from 'class-validator';

/**
 * Cambia el pack del próximo débito (RN-PAG-016).
 */
export class UpdateDebitMandateDto {
  @IsUUID()
  packId!: string;
}
