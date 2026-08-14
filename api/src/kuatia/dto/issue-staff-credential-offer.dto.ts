import { IsBoolean, IsOptional } from 'class-validator';

/**
 * Body para emitir / re-emitir offer de credencial staff.
 */
export class IssueStaffCredentialOfferDto {
  /** Si true, fuerza nueva oferta aunque haya PENDING/ACCEPTED. */
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}
