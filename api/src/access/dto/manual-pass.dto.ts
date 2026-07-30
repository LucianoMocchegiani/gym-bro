import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

/**
 * Body de pase manual en puerta (CU-ACC-004 / RN-ACC-006).
 */
export class ManualPassDto {
  @IsIn(['deuda', 'olvido_celular', 'cortesia', 'otro'])
  motiveCode!: 'deuda' | 'olvido_celular' | 'cortesia' | 'otro';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  /** Si hay reserva CONFIRMED del member en esta sesión, marca presente. */
  @IsOptional()
  @IsUUID()
  sessionId?: string;
}
