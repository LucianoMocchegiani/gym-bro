import {
  Body,
  Controller,
  Delete,
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
import { ListResult } from '../common/list';
import {
  CreateTenantDto,
  DeleteTenantDto,
  ListTenantsQueryDto,
  UpdateTenantDto,
} from './dto/tenant.dto';
import { TenantsService } from './tenants.service';
import { TenantResponse } from './tenants.types';

/**
 * CRUD de tenants para Super Admin (plataforma).
 *
 * @remarks Rutas bajo `/api/tenants`. No usa TenantGuard (RN-TEN-002 / CU-ROL-002).
 * Al crear: seed de sucursal default (RN-TEN-003 / S2) y roles Admin/Profesor (RN-ROL-002).
 */
@Controller('tenants')
@RequireSuperAuth()
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  /**
   * Crea un tenant ACTIVE + sucursal + roles + owner Admin.
   *
   * @see CU-ROL-001
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateTenantDto,
  ): Promise<TenantResponse> {
    return this.tenantsService.create(dto, toAuditActor(user));
  }

  /**
   * Lista tenants (paginado).
   */
  @Get()
  findAll(
    @Query() query: ListTenantsQueryDto,
  ): Promise<ListResult<TenantResponse>> {
    return this.tenantsService.findAll(query);
  }

  /**
   * Detalle de un tenant.
   */
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<TenantResponse> {
    return this.tenantsService.findOne(id);
  }

  /**
   * Actualiza nombre y/o status (`ACTIVE` | `SUSPENDED`).
   *
   * @see CU-ROL-002
   */
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateTenantDto,
  ): Promise<TenantResponse> {
    return this.tenantsService.update(id, dto, toAuditActor(user));
  }

  /**
   * Elimina un tenant (cascada total). Requiere `ELIMINAR` + slug.
   */
  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: DeleteTenantDto,
  ): ReturnType<TenantsService['remove']> {
    return this.tenantsService.remove(id, dto, toAuditActor(user));
  }
}
