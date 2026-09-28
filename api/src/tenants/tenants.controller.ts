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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlatformTenantGuard } from '../auth/guards/platform-tenant.guard';
import { UseGuards } from '@nestjs/common';
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
import { PlatformTenantSummary, TenantResponse } from './tenants.types';

/**
 * CRUD de tenants para Super Admin (plataforma).
 *
 * @remarks Rutas bajo `/api/tenants`. No usa TenantGuard (RN-TEN-002 / CU-ROL-002).
 * Al crear: seed de sucursal default (RN-TEN-003 / S2) y roles Admin/Entrenador (RN-ROL-002).
 */
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  /**
   * Alta de tenant + owner Admin, con branch default y roles sistema (CU-ROL-001).
   */
  @UseGuards(JwtAuthGuard, PlatformTenantGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateTenantDto,
  ): Promise<TenantResponse> {
    return this.tenantsService.create(dto, toAuditActor(user));
  }

  /**
   * Lista de tenants con membresía (para Super Admin).
   */
  @UseGuards(JwtAuthGuard, PlatformTenantGuard)
  @Get()
  findAll(
    @Query() query: ListTenantsQueryDto,
  ): Promise<ListResult<TenantResponse>> {
    return this.tenantsService.findAll(query);
  }

  /**
   * Lista de tenants para el dashboard de plataforma (staff del tenant `admin`).
   *
   * @remarks Vista resumen paginada (`PlatformTenantSummary`) con `q` por
   * name/slug; alimenta el grilla del dashboard y el `TenantPicker` de Caja.
   */
  @UseGuards(JwtAuthGuard, PlatformTenantGuard)
  @Get('platform')
  platformList(
    @Query() query: ListTenantsQueryDto,
  ): Promise<ListResult<PlatformTenantSummary>> {
    return this.tenantsService.platformList(query);
  }

  /**
   * Detalle de un tenant.
   */
  @UseGuards(JwtAuthGuard, PlatformTenantGuard)
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<TenantResponse> {
    return this.tenantsService.findOne(id);
  }

  /**
   * Actualiza nombre y/o status (`ACTIVE` | `SUSPENDED`).
   *
   * @see CU-ROL-002
   */
  @UseGuards(JwtAuthGuard, PlatformTenantGuard)
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
  @UseGuards(JwtAuthGuard, PlatformTenantGuard)
  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: DeleteTenantDto,
  ): ReturnType<TenantsService['remove']> {
    return this.tenantsService.remove(id, dto, toAuditActor(user));
  }
}
