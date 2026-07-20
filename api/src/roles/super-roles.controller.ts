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
import { RequireSuperAuth } from '../auth/decorators/require-super-auth.decorator';
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
   * Crea un rol custom en el tenant indicado.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Body() dto: CreateRoleDto,
  ): Promise<RoleDetail> {
    return this.rolesService.create(tenantId, dto);
  }

  /**
   * Edita Profesor o un rol custom del tenant indicado (Admin → 403).
   */
  @Patch(':roleId')
  update(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @Body() dto: UpdateRoleDto,
  ): Promise<RoleDetail> {
    return this.rolesService.update(tenantId, roleId, dto);
  }
}
