import { BadRequestException, Controller, Get } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../roles/decorators/require-permission.decorator';
import { CurrentTenant } from '../tenant/decorators/current-tenant.decorator';
import { RequireTenantAuth } from '../tenant/decorators/require-tenant-auth.decorator';
import { TenantsService } from './tenants.service';
import { GymPlanView } from './tenants.types';

/**
 * Plan Faciliter del gym del Host (`{slug}` → Sistema → Plan / Uso).
 */
@Controller('plan')
@RequireTenantAuth()
export class PlanController {
  constructor(private readonly tenants: TenantsService) {}

  /**
   * Contrato TENANT vigente (o el último) + si el staff es el dueño.
   *
   * @throws {BadRequestException} Tenant `admin` (no tiene plan Faciliter).
   */
  @Get()
  @RequirePermission('tenant.settings.read')
  get(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<GymPlanView> {
    if (user.profileType !== 'STAFF') {
      throw new BadRequestException('Staff profile required');
    }
    return this.tenants.getGymPlan(tenantId, user.userId);
  }
}
