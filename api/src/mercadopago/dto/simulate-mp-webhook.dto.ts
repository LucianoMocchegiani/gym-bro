import { IsIn, IsOptional, IsUUID } from 'class-validator';

/**
 * Simula resultado de cobro MP en modo stub (solo non-prod).
 *
 * @remarks `paymentId` para checkout single (pack/drop-in) o `cartId` para
 * carrito MP de Caja. Exactamente uno de los dos.
 */
export class SimulateMpWebhookDto {
  @IsOptional()
  @IsUUID()
  paymentId?: string;

  @IsOptional()
  @IsUUID()
  cartId?: string;

  @IsIn(['APPROVED', 'REJECTED'])
  status!: 'APPROVED' | 'REJECTED';
}
