import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { toAuditActor } from '../audit/to-audit-actor';
import { RequirePermission } from '../roles/decorators/require-permission.decorator';
import { RequireTenantAuth } from '../tenant/decorators/require-tenant-auth.decorator';
import { CurrentTenant } from '../tenant/decorators/current-tenant.decorator';
import { SetStaffRolesDto } from './dto/staff.dto';
import { StaffService } from './staff.service';
import { StaffUserDetail } from './staff.types';

/**
 * Staff del gym autenticado (solo su tenant).
 *
 * @remarks CU-ROL-004 / RN-ROL-007. Lectura: `staff.read`; asignación: `staff.write`.
 */
@Controller('staff')
@RequireTenantAuth()
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get(':staffId')
  @RequirePermission('staff.read')
  findOne(
    @CurrentTenant() tenantId: string,
    @Param('staffId', ParseUUIDPipe) staffId: string,
  ): Promise<StaffUserDetail> {
    return this.staffService.findOne(tenantId, staffId);
  }

  /**
   * Reemplaza roles del staff (multi-rol).
   */
  @Put(':staffId/roles')
  @RequirePermission('staff.write')
  setRoles(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Param('staffId', ParseUUIDPipe) staffId: string,
    @Body() dto: SetStaffRolesDto,
  ): Promise<StaffUserDetail> {
    return this.staffService.setRoles(
      tenantId,
      staffId,
      dto,
      toAuditActor(user),
    );
  }
}
