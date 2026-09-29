import { Type, Transform } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { MpCartItemDto } from './create-mp-cart-checkout.dto';

/**
 * Checkout en efectivo de carrito (Caja): 1 transacción con items[] → APPROVED inmediato.
 */
export class CreateCashCartDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MpCartItemDto)
  items!: MpCartItemDto[];

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  idempotencyKey?: string;

  /**
   * Caja plataforma: 30 días de prueba ($0). Ignorado / rechazado en cobro de afiliado.
   */
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  applyTrial?: boolean;
}
