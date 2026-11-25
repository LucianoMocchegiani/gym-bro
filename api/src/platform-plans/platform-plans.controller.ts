import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../roles/decorators/require-permission.decorator';
import { CurrentTenant } from '../tenant/decorators/current-tenant.decorator';
import { RequireTenantAuth } from '../tenant/decorators/require-tenant-auth.decorator';
import { UpdatePlatformPlanModulesDto } from './dto/update-platform-plan-modules.dto';
import { PlatformPlansService } from './platform-plans.service';

@Controller('platform-plans')
@RequireTenantAuth()
export class PlatformPlansController {
  constructor(private readonly plans: PlatformPlansService) {}

  @Get()
  @RequirePermission('platform.tenants.read')
  list(@CurrentTenant() tenantId: string) {
    return this.plans.list(tenantId);
  }

  @Patch(':packId/modules')
  @RequirePermission('platform.tenants.write')
  updateModules(
    @CurrentTenant() tenantId: string,
    @CurrentUser()
    user: {
      profileType: 'STAFF' | 'MEMBER' | 'IDENTITY';
      userId: string;
    },
    @Param('packId', ParseUUIDPipe) packId: string,
    @Body() dto: UpdatePlatformPlanModulesDto,
  ) {
    return this.plans.updateModules(tenantId, packId, dto.modules, user);
  }
}

@Controller('tenant')
@RequireTenantAuth()
export class TenantPlatformModulesController {
  constructor(private readonly plans: PlatformPlansService) {}

  @Get('platform-modules')
  get(@CurrentTenant() tenantId: string) {
    return this.plans
      .getTenantModules(tenantId)
      .then((modules) => ({ modules }));
  }
}
