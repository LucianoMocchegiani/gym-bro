import { Equals } from 'class-validator';
import { ACCOUNT_DELETION_CONFIRM_WORD } from '../account-deletion.constants';

/**
 * Body de `DELETE /api/me/identity`.
 *
 * @remarks La persona escribe la palabra a mano (RN-CTA-001): sirve igual para
 * cuentas con contraseña, Google o Apple.
 */
export class DeleteAccountDto {
  @Equals(ACCOUNT_DELETION_CONFIRM_WORD, {
    message: `Escribí ${ACCOUNT_DELETION_CONFIRM_WORD} para confirmar`,
  })
  confirm!: string;
}
