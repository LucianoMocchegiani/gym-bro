import { Body, Controller, Delete, Get, Put } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { toAuditActor } from '../audit/to-audit-actor';
import { RequirePermission } from '../roles/decorators/require-permission.decorator';
import { CurrentTenant } from '../tenant/decorators/current-tenant.decorator';
import { RequireTenantAuth } from '../tenant/decorators/require-tenant-auth.decorator';
import { PutTenantSiteDto } from './dto/tenant-site.dto';
import { TenantSiteService } from './tenant-site.service';
import { TenantSiteDetail } from './tenant-site.types';

/**
 * Web pública del gym (Sistema → Web del gym).
 *
 * @remarks RN-CTA-010. Mismos permisos que Config: lectura
 * `tenant.settings.read`, escritura `tenant.settings.write`.
 */
@Controller('tenant-site')
@RequireTenantAuth()
export class TenantSiteController {
  constructor(private readonly site: TenantSiteService) {}

  @Get()
  @RequirePermission('tenant.settings.read')
  get(@CurrentTenant() tenantId: string): Promise<TenantSiteDetail> {
    return this.site.get(tenantId);
  }

  @Put()
  @RequirePermission('tenant.settings.write')
  put(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: PutTenantSiteDto,
  ): Promise<TenantSiteDetail> {
    return this.site.put(tenantId, dto, toAuditActor(user));
  }

  @Delete()
  @RequirePermission('tenant.settings.write')
  reset(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<TenantSiteDetail> {
    return this.site.reset(tenantId, toAuditActor(user));
  }
}
