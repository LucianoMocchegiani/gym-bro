import { Body, Controller, Delete, UseGuards } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AccountDeletionService } from './account-deletion.service';
import { DeleteAccountDto } from './dto/delete-account.dto';

/**
 * Baja de la cuenta Faciliter (CU-CTA-001). Requisito de App Store y Google Play.
 *
 * @remarks Acepta cualquier JWT (identity, staff o socio): la app suele tener
 * sesión de socio y la web del apex sesión de identity.
 */
@Controller('me/identity')
@UseGuards(JwtAuthGuard)
export class AccountDeletionController {
  constructor(private readonly deletion: AccountDeletionService) {}

  /**
   * Elimina la cuenta de la persona autenticada. Body `{ "confirm": "ELIMINAR" }`.
   *
   * @throws 409 Si es dueña de un gym activo.
   */
  @Delete()
  delete(
    @CurrentUser() user: AuthUser,
    @Body() dto: DeleteAccountDto,
  ): Promise<{ ok: true }> {
    return this.deletion.deleteAccount(user, dto.confirm);
  }
}
