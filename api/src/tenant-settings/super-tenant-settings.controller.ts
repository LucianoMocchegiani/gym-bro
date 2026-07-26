import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequireSuperAuth } from '../auth/decorators/require-super-auth.decorator';
import { toAuditActor } from '../audit/to-audit-actor';
import { UpdateTenantSettingsDto } from './dto/tenant-settings.dto';
import { TenantSettingsService } from './tenant-settings.service';
import { TenantSettingsDetail } from './tenant-settings.types';

/**
 * Configuración operativa por tenant (Super Admin).
 */
@Controller('tenants/:tenantId/settings')
@RequireSuperAuth()
export class SuperTenantSettingsController {
  constructor(private readonly tenantSettings: TenantSettingsService) {}

  @Get()
  get(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
  ): Promise<TenantSettingsDetail> {
    return this.tenantSettings.get(tenantId);
  }

  @Patch()
  update(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateTenantSettingsDto,
  ): Promise<TenantSettingsDetail> {
    return this.tenantSettings.update(tenantId, dto, toAuditActor(user));
  }
}
