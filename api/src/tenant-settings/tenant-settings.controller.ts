import { Body, Controller, Get, Patch } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { toAuditActor } from '../audit/to-audit-actor';
import { RequirePermission } from '../roles/decorators/require-permission.decorator';
import { CurrentTenant } from '../tenant/decorators/current-tenant.decorator';
import { RequireTenantAuth } from '../tenant/decorators/require-tenant-auth.decorator';
import { UpdateTenantSettingsDto } from './dto/tenant-settings.dto';
import { TenantSettingsService } from './tenant-settings.service';
import { TenantSettingsDetail } from './tenant-settings.types';

/**
 * Configuración operativa del gym (staff).
 *
 * @remarks RN-TEN-005. Lectura `tenant.settings.read`; escritura `tenant.settings.write`.
 */
@Controller('tenant-settings')
@RequireTenantAuth()
export class TenantSettingsController {
  constructor(private readonly tenantSettings: TenantSettingsService) {}

  @Get()
  @RequirePermission('tenant.settings.read')
  get(@CurrentTenant() tenantId: string): Promise<TenantSettingsDetail> {
    return this.tenantSettings.get(tenantId);
  }

  @Patch()
  @RequirePermission('tenant.settings.write')
  update(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateTenantSettingsDto,
  ): Promise<TenantSettingsDetail> {
    return this.tenantSettings.update(tenantId, dto, toAuditActor(user));
  }
}
