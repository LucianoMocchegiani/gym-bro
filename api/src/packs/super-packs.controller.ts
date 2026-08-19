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
import { RequireSuperAuth } from '../auth/decorators/require-super-auth.decorator';
import { toAuditActor } from '../audit/to-audit-actor';
import { ListResult } from '../common/list';
import {
  CreatePackDto,
  ListPacksQueryDto,
  UpdatePackDto,
} from './dto/pack.dto';
import { PacksService } from './packs.service';
import { PackDetail } from './packs.types';

/**
 * Packs por tenant (Super Admin).
 *
 * @remarks Path: `/api/tenants/:tenantId/packs`.
 */
@Controller('tenants/:tenantId/packs')
@RequireSuperAuth()
export class SuperPacksController {
  constructor(private readonly packsService: PacksService) {}

  @Get()
  list(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Query() query: ListPacksQueryDto,
  ): Promise<ListResult<PackDetail>> {
    return this.packsService.list(tenantId, query);
  }

  @Get(':packId')
  findOne(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('packId', ParseUUIDPipe) packId: string,
  ): Promise<PackDetail> {
    return this.packsService.findOne(tenantId, packId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreatePackDto,
  ): Promise<PackDetail> {
    return this.packsService.create(tenantId, dto, toAuditActor(user));
  }

  @Patch(':packId')
  update(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('packId', ParseUUIDPipe) packId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdatePackDto,
  ): Promise<PackDetail> {
    return this.packsService.update(tenantId, packId, dto, toAuditActor(user));
  }

  @Delete(':packId')
  remove(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('packId', ParseUUIDPipe) packId: string,
    @CurrentUser() user: AuthUser,
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
