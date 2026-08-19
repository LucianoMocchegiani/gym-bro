import { Controller, ForbiddenException, Get } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentTenant } from '../tenant/decorators/current-tenant.decorator';
import { RequireTenantAuth } from '../tenant/decorators/require-tenant-auth.decorator';
import { PermissionsService } from './permissions.service';

export type MyPermissionsResponse = {
  permissionCodes: string[];
};

/**
 * Permisos efectivos del staff autenticado (nav / UI).
 *
 * @remarks Unión de roles del tenant (RN-ROL-007). No sustituye guards de API.
 */
@Controller()
@RequireTenantAuth()
export class MePermissionsController {
  constructor(private readonly permissions: PermissionsService) {}

  @Get('me/permissions')
  async listMine(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<MyPermissionsResponse> {
    if (user.profileType !== 'STAFF') {
      throw new ForbiddenException('Staff profile required');
    }
    const codes = await this.permissions.getPermissionCodes(
      user.userId,
      tenantId,
    );
    return { permissionCodes: [...codes].sort() };
  }
}
