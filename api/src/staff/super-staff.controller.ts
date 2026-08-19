import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { RequireSuperAuth } from '../auth/decorators/require-super-auth.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { toAuditActor } from '../audit/to-audit-actor';
import { ListQueryDto, ListResult } from '../common/list';
import { CreateStaffDto, SetStaffRolesDto } from './dto/staff.dto';
import { StaffService } from './staff.service';
import { StaffUserDetail } from './staff.types';

/**
 * Staff por tenant para Super Admin.
 *
 * @remarks Path: `/api/tenants/:tenantId/staff/...`
 */
@Controller('tenants/:tenantId/staff')
@RequireSuperAuth()
export class SuperStaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get()
  list(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Query() query: ListQueryDto,
  ): Promise<ListResult<StaffUserDetail>> {
    return this.staffService.list(tenantId, query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateStaffDto,
  ): Promise<StaffUserDetail> {
    return this.staffService.create(tenantId, dto, toAuditActor(user));
  }

  @Get(':staffId')
  findOne(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('staffId', ParseUUIDPipe) staffId: string,
  ): Promise<StaffUserDetail> {
    return this.staffService.findOne(tenantId, staffId);
  }

  @Put(':staffId/roles')
  setRoles(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('staffId', ParseUUIDPipe) staffId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: SetStaffRolesDto,
  ): Promise<StaffUserDetail> {
    return this.staffService.setRoles(
      tenantId,
      staffId,
      dto,
      toAuditActor(user),
    );
  }

  @Delete(':staffId')
  remove(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('staffId', ParseUUIDPipe) staffId: string,
    @CurrentUser() user: AuthUser,
  ): ReturnType<StaffService['remove']> {
    return this.staffService.remove(tenantId, staffId, toAuditActor(user));
  }
}
