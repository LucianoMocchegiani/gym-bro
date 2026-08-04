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
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { toAuditActor } from '../audit/to-audit-actor';
import { ListResult } from '../common/list';
import { RequirePermission } from '../roles/decorators/require-permission.decorator';
import { CurrentTenant } from '../tenant/decorators/current-tenant.decorator';
import { RequireTenantAuth } from '../tenant/decorators/require-tenant-auth.decorator';
import {
  CreateServiceDto,
  ListServicesQueryDto,
  UpdateServiceDto,
} from './dto/service.dto';
import { ServicesService } from './services.service';
import { ServiceDetail } from './services.types';

/**
 * Catálogo de servicios del gym (staff).
 *
 * @remarks CU-SER-001. Requiere `catalog.write` (lectura y mutación en MVP).
 */
@Controller('services')
@RequireTenantAuth()
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get()
  @RequirePermission('catalog.write')
  list(
    @CurrentTenant() tenantId: string,
    @Query() query: ListServicesQueryDto,
  ): Promise<ListResult<ServiceDetail>> {
    return this.servicesService.list(tenantId, query);
  }

  @Get(':serviceId')
  @RequirePermission('catalog.write')
  findOne(
    @CurrentTenant() tenantId: string,
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
  ): Promise<ServiceDetail> {
    return this.servicesService.findOne(tenantId, serviceId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('catalog.write')
  create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateServiceDto,
  ): Promise<ServiceDetail> {
    return this.servicesService.create(tenantId, dto, toAuditActor(user));
  }

  @Patch(':serviceId')
  @RequirePermission('catalog.write')
  update(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Body() dto: UpdateServiceDto,
  ): Promise<ServiceDetail> {
    return this.servicesService.update(
      tenantId,
      serviceId,
      dto,
      toAuditActor(user),
    );
  }
}
