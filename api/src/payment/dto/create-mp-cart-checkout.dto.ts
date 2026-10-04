import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

/**
 * Ítem del carrito MP: pack o drop-in de una sesión.
 */
export class MpCartItemDto {
  @IsIn(['PACK', 'DROP_IN'])
  kind!: 'PACK' | 'DROP_IN';

  @IsUUID()
  id!: string;

  /** Cantidad (default 1). Crea N payments del mismo ítem. */
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;
}

/**
 * Inicia checkout MP de carrito: 1 preference con items[] → 1 pago.
 *
 * @remarks CU-PAG-001 / modelo MercadoLibre. Mismo body en Caja
 * (`POST /members/:id/.../mp/cart`) y afiliado (`POST /me/.../mp/cart`).
 * Cada ítem genera 1+ Payment PENDING; los derechos se confirman al webhook APPROVED.
 */
export class CreateMpCartCheckoutDto {
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
   * Web del gym: al terminar, MP vuelve a `{slug}/portal?compra={transactionId}`.
   * La app no lo manda.
   */
  @IsOptional()
  @IsBoolean()
  returnToWeb?: boolean;

  /**
   * Caja plataforma: no soportado en MP todavía (usar efectivo + prueba).
   */
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  applyTrial?: boolean;
}
