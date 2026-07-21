import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
} from '@nestjs/common';
import { RequireSuperAuth } from '../auth/decorators/require-super-auth.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { toAuditActor } from '../audit/to-audit-actor';
import { SetStaffRolesDto } from './dto/staff.dto';
import { StaffService } from './staff.service';
import { StaffUserDetail } from './staff.types';

/**
 * Staff por tenant para Super Admin.
 *
 * @remarks Path: `/api/tenants/:tenantId/staff/...`
 */
@Controller('tenants/:tenantId/staff')
@RequireSuperAuth()
export class SuperStaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get(':staffId')
  findOne(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('staffId', ParseUUIDPipe) staffId: string,
  ): Promise<StaffUserDetail> {
    return this.staffService.findOne(tenantId, staffId);
  }

  @Put(':staffId/roles')
  setRoles(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('staffId', ParseUUIDPipe) staffId: string,
    @CurrentUser() user: AuthUser,
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
