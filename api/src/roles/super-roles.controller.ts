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
import { RequireSuperAuth } from '../auth/decorators/require-super-auth.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { toAuditActor } from '../audit/to-audit-actor';
import { ListQueryDto, ListResult } from '../common/list';
import { CreateRoleDto, UpdateRoleDto } from './dto/role.dto';
import { RolesService } from './roles.service';
import { RoleDetail } from './roles.types';

/**
 * Roles por tenant para Super Admin (cualquier gym).
 *
 * @remarks CU-ROL-003 / RN-TEN-002. Path: `/api/tenants/:tenantId/roles`.
 */
@Controller('tenants/:tenantId/roles')
@RequireSuperAuth()
export class SuperRolesController {
  constructor(private readonly rolesService: RolesService) {}

  /**
   * Lista roles del tenant (sistema + custom).
   */
  @Get()
  list(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Query() query: ListQueryDto,
  ): Promise<ListResult<RoleDetail>> {
    return this.rolesService.list(tenantId, query);
  }

  /**
   * Detalle de un rol del tenant indicado.
   */
  @Get(':roleId')
  findOne(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('roleId', ParseUUIDPipe) roleId: string,
  ): Promise<RoleDetail> {
    return this.rolesService.findOne(tenantId, roleId);
  }

  /**
   * Crea un rol custom en el tenant indicado.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateRoleDto,
  ): Promise<RoleDetail> {
    return this.rolesService.create(tenantId, dto, toAuditActor(user));
  }

  /**
   * Edita Profesor o un rol custom del tenant indicado (Admin → 403).
   */
  @Patch(':roleId')
  update(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateRoleDto,
  ): Promise<RoleDetail> {
    return this.rolesService.update(tenantId, roleId, dto, toAuditActor(user));
  }
}
