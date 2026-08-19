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
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { toAuditActor } from '../audit/to-audit-actor';
import { ListResult } from '../common/list';
import { RequirePermission } from '../roles/decorators/require-permission.decorator';
import { CurrentTenant } from '../tenant/decorators/current-tenant.decorator';
import { RequireTenantAuth } from '../tenant/decorators/require-tenant-auth.decorator';
import {
  CreatePackDto,
  ListPacksQueryDto,
  UpdatePackDto,
} from './dto/pack.dto';
import { PacksService } from './packs.service';
import { PackDetail } from './packs.types';

/**
 * Packs del catálogo (staff).
 *
 * @remarks CU-SER-002. Requiere `catalog.write`.
 */
@Controller('packs')
@RequireTenantAuth()
export class PacksController {
  constructor(private readonly packsService: PacksService) {}

  @Get()
  @RequirePermission('catalog.write')
  list(
    @CurrentTenant() tenantId: string,
    @Query() query: ListPacksQueryDto,
  ): Promise<ListResult<PackDetail>> {
    return this.packsService.list(tenantId, query);
  }

  @Get(':packId')
  @RequirePermission('catalog.write')
  findOne(
    @CurrentTenant() tenantId: string,
    @Param('packId', ParseUUIDPipe) packId: string,
  ): Promise<PackDetail> {
    return this.packsService.findOne(tenantId, packId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('catalog.write')
  create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreatePackDto,
  ): Promise<PackDetail> {
    return this.packsService.create(tenantId, dto, toAuditActor(user));
  }

  @Patch(':packId')
  @RequirePermission('catalog.write')
  update(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Param('packId', ParseUUIDPipe) packId: string,
    @Body() dto: UpdatePackDto,
  ): Promise<PackDetail> {
    return this.packsService.update(tenantId, packId, dto, toAuditActor(user));
  }

  @Delete(':packId')
  @RequirePermission('catalog.write')
  remove(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Param('packId', ParseUUIDPipe) packId: string,
    @Query('confirm') confirm?: string,
  ): ReturnType<PacksService['remove']> {
    return this.packsService.remove(
      tenantId,
      packId,
      toAuditActor(user),
      confirm === 'deactivate',
    );
  }
}
