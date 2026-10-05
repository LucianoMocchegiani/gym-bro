import { Type, Transform } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { MpCartItemDto } from './create-mp-cart-checkout.dto';

/**
 * Cobro presencial de carrito (Caja, efectivo o transferencia): 1 transacción
 * con items[] → APPROVED inmediato.
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

  /** Medio presencial. Sin valor = efectivo (apps viejas). */
  @IsOptional()
  @IsIn(['CASH', 'TRANSFER'])
  method?: 'CASH' | 'TRANSFER';

  /**
   * Descuento de la venta en % (RN-PAG-020), aplicado a cada ítem. Sin valor =
   * precio de lista: el default del gym lo precarga el cliente.
   */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99)
  discountPercent?: number;

  /** Transferencia: nº de operación o quién transfirió. */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  transferReference?: string;
}
