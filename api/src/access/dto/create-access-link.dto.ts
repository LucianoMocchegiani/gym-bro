import { IsString, Matches } from 'class-validator';
import { ACCESS_EXTERNAL_ID_PATTERN } from './zkteco-event.dto';

/**
 * Vincula un número de usuario del aparato ZKTeco con un socio o staff (RN-ACC-011).
 */
export class CreateAccessLinkDto {
  @IsString()
  @Matches(ACCESS_EXTERNAL_ID_PATTERN, {
    message: 'externalId: 1 a 32 letras, números, guion o guion bajo',
  })
  externalId!: string;
}
