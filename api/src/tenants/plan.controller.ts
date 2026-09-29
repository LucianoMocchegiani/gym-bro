import { BadRequestException, Controller, Get } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentTenant } from '../tenant/decorators/current-tenant.decorator';
import { AllowWhenLimited } from '../tenant/decorators/allow-when-limited.decorator';
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
   * @remarks Sin `tenant.settings.read`: en modo limitado todo el staff debe
   * poder abrir Plan / Uso.
   * @throws {BadRequestException} Tenant `admin` o perfil no staff.
   */
  @Get()
  @AllowWhenLimited()
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
