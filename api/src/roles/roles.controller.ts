import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { toAuditActor } from '../audit/to-audit-actor';
import { ListQueryDto, ListResult } from '../common/list';
import { RequireTenantAuth } from '../tenant/decorators/require-tenant-auth.decorator';
import { CurrentTenant } from '../tenant/decorators/current-tenant.decorator';
import { RequirePermission } from './decorators/require-permission.decorator';
import { CreateRoleDto, UpdateRoleDto } from './dto/role.dto';
import { RolesService } from './roles.service';
import { RoleDetail } from './roles.types';

/**
 * Roles del gym para staff autenticado (solo su tenant).
 *
 * @remarks CU-ROL-003 / RN-ROL-007. Requiere `roles.write` (lectura y mutación en MVP).
 */
@Controller('roles')
@RequireTenantAuth()
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  /**
   * Lista roles del tenant del JWT (Admin, Profesor y custom).
   */
  @Get()
  @RequirePermission('roles.write')
  list(
    @CurrentTenant() tenantId: string,
    @Query() query: ListQueryDto,
  ): Promise<ListResult<RoleDetail>> {
    return this.rolesService.list(tenantId, query);
  }

  /**
   * Detalle de un rol del tenant del JWT.
   */
  @Get(':roleId')
  @RequirePermission('roles.write')
  findOne(
    @CurrentTenant() tenantId: string,
    @Param('roleId', ParseUUIDPipe) roleId: string,
  ): Promise<RoleDetail> {
    return this.rolesService.findOne(tenantId, roleId);
  }

  /**
   * Crea un rol custom en el tenant del JWT.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('roles.write')
  create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateRoleDto,
  ): Promise<RoleDetail> {
    return this.rolesService.create(tenantId, dto, toAuditActor(user));
  }

  /**
   * Edita Profesor o un rol custom del tenant del JWT.
   */
  @Patch(':roleId')
  @RequirePermission('roles.write')
  update(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @Body() dto: UpdateRoleDto,
  ): Promise<RoleDetail> {
    return this.rolesService.update(tenantId, roleId, dto, toAuditActor(user));
  }
}
