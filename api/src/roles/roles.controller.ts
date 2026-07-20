import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { RequireTenantAuth } from '../tenant/decorators/require-tenant-auth.decorator';
import { CurrentTenant } from '../tenant/decorators/current-tenant.decorator';
import { CreateRoleDto, UpdateRoleDto } from './dto/role.dto';
import { RolesService } from './roles.service';
import { RoleDetail } from './roles.types';

/**
 * Roles del gym para staff autenticado (solo su tenant).
 *
 * @remarks CU-ROL-003. El filtro fino `roles.write` llega con asignación de roles.
 */
@Controller('roles')
@RequireTenantAuth()
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  /**
   * Crea un rol custom en el tenant del JWT.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateRoleDto,
  ): Promise<RoleDetail> {
    return this.rolesService.create(tenantId, dto);
  }

  /**
   * Edita Profesor o un rol custom del tenant del JWT.
   */
  @Patch(':roleId')
  update(
    @CurrentTenant() tenantId: string,
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @Body() dto: UpdateRoleDto,
  ): Promise<RoleDetail> {
    return this.rolesService.update(tenantId, roleId, dto);
  }
}
