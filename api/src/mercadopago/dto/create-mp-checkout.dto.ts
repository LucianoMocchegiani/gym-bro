import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Inicia checkout MP para comprar un pack (CU-PAG-001 / CU-CON-001).
 */
export class CreateMpCheckoutDto {
  @IsUUID()
  packId!: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  idempotencyKey?: string;
}
