import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { RequireSuperAuth } from '../auth/decorators/require-super-auth.decorator';
import { ListQueryDto, ListResult } from '../common/list';
import { StaffService } from './staff.service';
import { StaffUserDetail } from './staff.types';

/**
 * Listado de staff de un tenant para Super Admin (impersonate).
 *
 * @remarks Path: `GET /api/tenants/:tenantId/staff`. Alta, ficha, roles y baja
 * se hacen impersonando (`POST /auth/super/impersonate`) y usando rutas Staff.
 */
@Controller('tenants/:tenantId/staff')
@RequireSuperAuth()
export class SuperStaffController {
  constructor(private readonly staffService: StaffService) {}

  /**
   * Lista staff del gym (para elegir a quién impersonar).
   */
  @Get()
  list(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Query() query: ListQueryDto,
  ): Promise<ListResult<StaffUserDetail>> {
    return this.staffService.list(tenantId, query);
  }
}
