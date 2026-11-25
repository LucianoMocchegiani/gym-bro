import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ContractStatus } from '@prisma/client';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { toAuditActor } from '../audit/to-audit-actor';
import { ListResult } from '../common/list';
import { RequirePermission } from '../roles/decorators/require-permission.decorator';
import { CurrentTenant } from '../tenant/decorators/current-tenant.decorator';
import { RequirePlatformModule } from '../tenant/decorators/require-platform-module.decorator';
import { RequireTenantAuth } from '../tenant/decorators/require-tenant-auth.decorator';
import {
  CreateMemberDto,
  ListMembersQueryDto,
  UpdateMemberDto,
  UpdateMemberStatusDto,
} from './dto/member.dto';
import { MembersService } from './members.service';
import { MemberAccountDetail, MemberDetail } from './members.types';

@Controller()
@RequireTenantAuth()
@RequirePlatformModule('club')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get('members')
  @RequirePermission('members.read')
  list(@CurrentTenant() tenantId: string, @Query() query: ListMembersQueryDto): Promise<ListResult<MemberDetail>> {
    return this.membersService.list(tenantId, query);
  }

  @Get('me/account')
  getMine(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Query('status', new ParseEnumPipe(ContractStatus, { optional: true })) contractStatus?: ContractStatus,
    @Query('coverage') coverage?: string,
  ): Promise<MemberAccountDetail> {
    if (user.profileType !== 'MEMBER') throw new ForbiddenException('Member profile required');
    return this.membersService.getAccount(tenantId, user.userId, {
      contractStatus,
      coverage: coverage === 'all' ? 'all' : 'current',
    });
  }

  @Get('members/:memberId/account')
  @RequirePermission('members.read')
  getAccount(
    @CurrentTenant() tenantId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Query('status', new ParseEnumPipe(ContractStatus, { optional: true })) contractStatus?: ContractStatus,
    @Query('coverage') coverage?: string,
  ): Promise<MemberAccountDetail> {
    return this.membersService.getAccount(tenantId, memberId, {
      contractStatus,
      coverage: coverage === 'current' ? 'current' : 'all',
    });
  }

  @Get('members/:memberId')
  @RequirePermission('members.read')
  findOne(@CurrentTenant() tenantId: string, @Param('memberId', ParseUUIDPipe) memberId: string): Promise<MemberDetail> {
    return this.membersService.findOne(tenantId, memberId);
  }

  @Post('members')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('members.write')
  create(@CurrentTenant() tenantId: string, @CurrentUser() user: AuthUser, @Body() dto: CreateMemberDto): Promise<MemberDetail> {
    return this.membersService.create(tenantId, dto, toAuditActor(user));
  }

  @Patch('members/:memberId')
  @RequirePermission('members.write')
  update(@CurrentTenant() tenantId: string, @CurrentUser() user: AuthUser, @Param('memberId', ParseUUIDPipe) memberId: string, @Body() dto: UpdateMemberDto): Promise<MemberDetail> {
    return this.membersService.update(tenantId, memberId, dto, toAuditActor(user));
  }

  @Patch('members/:memberId/status')
  @RequirePermission('members.deactivate')
  updateStatus(@CurrentTenant() tenantId: string, @CurrentUser() user: AuthUser, @Param('memberId', ParseUUIDPipe) memberId: string, @Body() dto: UpdateMemberStatusDto): Promise<MemberDetail> {
    return this.membersService.updateStatus(tenantId, memberId, dto, toAuditActor(user));
  }

  @Delete('members/:memberId')
  @RequirePermission('members.deactivate')
  remove(@CurrentTenant() tenantId: string, @CurrentUser() user: AuthUser, @Param('memberId', ParseUUIDPipe) memberId: string): ReturnType<MembersService['remove']> {
    return this.membersService.remove(tenantId, memberId, toAuditActor(user));
  }
}
