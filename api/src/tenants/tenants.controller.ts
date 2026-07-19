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
} from '@nestjs/common';
import { RequireSuperAuth } from '../auth/decorators/require-super-auth.decorator';
import { CreateTenantDto, UpdateTenantDto } from './dto/tenant.dto';
import { TenantsService } from './tenants.service';
import { TenantResponse } from './tenants.types';

/**
 * CRUD de tenants para Super Admin (plataforma).
 *
 * @remarks Rutas bajo `/api/tenants`. No usa TenantGuard (RN-TEN-002).
 * Suspender tenant es una tarea E1 separada.
 */
@Controller('tenants')
@RequireSuperAuth()
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  /**
   * Crea un tenant ACTIVE.
   *
   * @see CU-ROL-001 (parcial: solo entidad Tenant)
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateTenantDto): Promise<TenantResponse> {
    return this.tenantsService.create(dto);
  }

  /**
   * Lista todos los tenants.
   */
  @Get()
  findAll(): Promise<TenantResponse[]> {
    return this.tenantsService.findAll();
  }

  /**
   * Detalle de un tenant.
   */
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<TenantResponse> {
    return this.tenantsService.findOne(id);
  }

  /**
   * Renombra un tenant (sin cambiar status).
   */
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTenantDto,
  ): Promise<TenantResponse> {
    return this.tenantsService.update(id, dto);
  }
}
