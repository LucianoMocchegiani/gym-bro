import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Inicia checkout MP para drop-in de una sesión (CU-RES-001 / CU-PAG-001).
 */
export class CreateMpDropInCheckoutDto {
  @IsUUID()
  sessionId!: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  idempotencyKey?: string;
}
