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
import { RequireSuperAuth } from '../auth/decorators/require-super-auth.decorator';
import { toAuditActor } from '../audit/to-audit-actor';
import { ListResult } from '../common/list';
import {
  CreateServiceDto,
  ListServicesQueryDto,
  UpdateServiceDto,
} from './dto/service.dto';
import { ServicesService } from './services.service';
import { ServiceDetail } from './services.types';

/**
 * Servicios por tenant (Super Admin).
 *
 * @remarks Path: `/api/tenants/:tenantId/services`.
 */
@Controller('tenants/:tenantId/services')
@RequireSuperAuth()
export class SuperServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get()
  list(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Query() query: ListServicesQueryDto,
  ): Promise<ListResult<ServiceDetail>> {
    return this.servicesService.list(tenantId, query);
  }

  @Get(':serviceId')
  findOne(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
  ): Promise<ServiceDetail> {
    return this.servicesService.findOne(tenantId, serviceId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateServiceDto,
  ): Promise<ServiceDetail> {
    return this.servicesService.create(tenantId, dto, toAuditActor(user));
  }

  @Patch(':serviceId')
  update(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @CurrentUser() user: AuthUser,
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
