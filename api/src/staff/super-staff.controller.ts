import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlatformTenantGuard } from '../auth/guards/platform-tenant.guard';
import { PermissionGuard } from '../roles/guards/permission.guard';
import { RequirePermission } from '../roles/decorators/require-permission.decorator';
import { ListQueryDto, ListResult } from '../common/list';
import { StaffService } from './staff.service';
import { StaffUserDetail } from './staff.types';

/**
 * Listado de staff de un tenant para la Caja de plataforma (impersonate).
 *
 * @remarks Path: `GET /api/tenants/:tenantId/staff`. El `tenantId` es el gym
 * **destino** (no el admin): sirve para elegir a quién impersonar en
 * `POST /auth/super/impersonate`. Alta, ficha, roles y baja se hacen
 * impersonando y usando rutas Staff.
 *
 * Orden de decorators: `@RequirePermission` va arriba porque trae su propio
 * `UseGuards(PermissionGuard)` y `UseGuards` agrega al array (ver
 * `require-permission.decorator.ts`). Si quedara abajo, `PermissionGuard`
 * correría antes de `JwtAuthGuard` y vería `request.user === undefined` → 401.
 */
@Controller('tenants/:tenantId/staff')
@RequirePermission('platform.impersonate')
@UseGuards(JwtAuthGuard, PlatformTenantGuard, PermissionGuard)
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
