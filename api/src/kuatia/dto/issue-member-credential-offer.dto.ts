import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

/**
 * Body para emitir / re-emitir offer OID4VCI de un pack que cubre hoy.
 */
export class IssueMemberCredentialOfferDto {
  /** Si true, fuerza nueva oferta aunque haya PENDING/ACCEPTED. Default true. */
  @IsOptional()
  @IsBoolean()
  force?: boolean;

  /**
   * Pack a emitir. Si se omite, el contrato vigente de `startsAt` más reciente.
   */
  @IsOptional()
  @IsUUID('4')
  packId?: string;
}
