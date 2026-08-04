import {
  Body,
  Controller,
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
import { RequireSuperAuth } from '../auth/decorators/require-super-auth.decorator';
import { toAuditActor } from '../audit/to-audit-actor';
import { ListResult } from '../common/list';
import {
  CreateMemberDto,
  ListMembersQueryDto,
  UpdateMemberDto,
  UpdateMemberStatusDto,
} from './dto/member.dto';
import { MembersService } from './members.service';
import { MemberAccountDetail, MemberDetail } from './members.types';

/**
 * Afiliados por tenant (Super Admin).
 *
 * @remarks Path: `/api/tenants/:tenantId/members`.
 */
@Controller('tenants/:tenantId/members')
@RequireSuperAuth()
export class SuperMembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  list(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Query() query: ListMembersQueryDto,
  ): Promise<ListResult<MemberDetail>> {
    return this.membersService.list(tenantId, query);
  }

  @Get(':memberId/account')
  getAccount(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Query('status', new ParseEnumPipe(ContractStatus, { optional: true }))
    contractStatus?: ContractStatus,
  ): Promise<MemberAccountDetail> {
    return this.membersService.getAccount(tenantId, memberId, {
      contractStatus,
    });
  }

  @Get(':memberId')
  findOne(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
  ): Promise<MemberDetail> {
    return this.membersService.findOne(tenantId, memberId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateMemberDto,
  ): Promise<MemberDetail> {
    return this.membersService.create(tenantId, dto, toAuditActor(user));
  }

  @Patch(':memberId')
  update(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateMemberDto,
  ): Promise<MemberDetail> {
    return this.membersService.update(
      tenantId,
      memberId,
      dto,
      toAuditActor(user),
    );
  }

  @Patch(':memberId/status')
  updateStatus(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateMemberStatusDto,
  ): Promise<MemberDetail> {
    return this.membersService.updateStatus(
      tenantId,
      memberId,
      dto,
      toAuditActor(user),
    );
  }
}
