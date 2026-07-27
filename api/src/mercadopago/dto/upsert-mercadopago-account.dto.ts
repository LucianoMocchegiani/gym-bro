import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Conectar o reemplazar la cuenta Mercado Pago del gym (CU-PAG-006).
 */
export class UpsertMercadoPagoAccountDto {
  @IsString()
  @MinLength(10)
  @MaxLength(512)
  accessToken!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(256)
  publicKey!: string;

  /**
   * Si true (default), valida el token contra MP antes de persistir.
   */
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  validate?: boolean;
}
