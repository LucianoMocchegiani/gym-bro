import { IsBoolean, IsOptional } from 'class-validator';

/**
 * Body para emitir / re-emitir offer OID4VCI del pack vigente del afiliado.
 */
export class IssueMemberCredentialOfferDto {
  /** Si true, fuerza nueva oferta aunque haya PENDING/ACCEPTED. Default true. */
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}
