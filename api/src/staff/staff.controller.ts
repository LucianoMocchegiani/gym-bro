import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
} from '@nestjs/common';
import { RequireTenantAuth } from '../tenant/decorators/require-tenant-auth.decorator';
import { CurrentTenant } from '../tenant/decorators/current-tenant.decorator';
import { SetStaffRolesDto } from './dto/staff.dto';
import { StaffService } from './staff.service';
import { StaffUserDetail } from './staff.types';

/**
 * Staff del gym autenticado (solo su tenant).
 *
 * @remarks CU-ROL-004. Filtro fino `staff.write` llega después.
 */
@Controller('staff')
@RequireTenantAuth()
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get(':staffId')
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
  setRoles(
    @CurrentTenant() tenantId: string,
    @Param('staffId', ParseUUIDPipe) staffId: string,
    @Body() dto: SetStaffRolesDto,
  ): Promise<StaffUserDetail> {
    return this.staffService.setRoles(tenantId, staffId, dto);
  }
}
