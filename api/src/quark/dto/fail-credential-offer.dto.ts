import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Body opcional al marcar un offer OID4VCI como `FAILED` desde la app.
 *
 * @remarks La wallet ya falló al canjear (offer muerto / vencido). GymBro
 * solo actualiza estado; no llama a Quark.
 */
export class FailCredentialOfferDto {
  /** Motivo corto para staff (`lastError`). Default en servicio si omite. */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
