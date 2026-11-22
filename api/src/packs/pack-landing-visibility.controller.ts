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
import { toAuditActor } from '../audit/to-audit-actor';
import { RequirePermission } from '../roles/decorators/require-permission.decorator';
import { CurrentTenant } from '../tenant/decorators/current-tenant.decorator';
import { RequireTenantAuth } from '../tenant/decorators/require-tenant-auth.decorator';
import { IsBoolean } from 'class-validator';
import { PackLandingVisibilityService } from './pack-landing-visibility.service';

class UpdatePackLandingVisibilityDto {
  @IsBoolean()
  showOnLanding!: boolean;
}

@Controller('packs')
@RequireTenantAuth()
export class PackLandingVisibilityController {
  constructor(private readonly visibility: PackLandingVisibilityService) {}

  @Get(':packId/landing-visibility')
  @RequirePermission('catalog.write')
  get(
    @CurrentTenant() tenantId: string,
    @Param('packId', ParseUUIDPipe) packId: string,
  ): Promise<{ showOnLanding: boolean }> {
    return this.visibility
      .get(tenantId, packId)
      .then((showOnLanding) => ({ showOnLanding }));
  }

  @Patch(':packId/landing-visibility')
  @RequirePermission('catalog.write')
  async update(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Param('packId', ParseUUIDPipe) packId: string,
    @Body() dto: UpdatePackLandingVisibilityDto,
  ): Promise<{ showOnLanding: boolean }> {
    const showOnLanding = await this.visibility.update(
      tenantId,
      packId,
      dto.showOnLanding,
      toAuditActor(user),
    );
    return { showOnLanding };
  }
}
