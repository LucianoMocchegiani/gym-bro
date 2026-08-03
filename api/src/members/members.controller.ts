import {
  Body,
  Controller,
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
import { ContractStatus, MemberStatus } from '@prisma/client';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { toAuditActor } from '../audit/to-audit-actor';
import { RequirePermission } from '../roles/decorators/require-permission.decorator';
import { CurrentTenant } from '../tenant/decorators/current-tenant.decorator';
import { RequireTenantAuth } from '../tenant/decorators/require-tenant-auth.decorator';
import {
  CreateMemberDto,
  UpdateMemberDto,
  UpdateMemberStatusDto,
} from './dto/member.dto';
import { MembersService } from './members.service';
import { MemberAccountDetail, MemberDetail } from './members.types';

/**
 * Afiliados del gym (staff) y estado de cuenta propio (member).
 *
 * @remarks CU-AFI-001..005 / RN-ROL-007. Credencial SSI: módulo `access`.
 */
@Controller()
@RequireTenantAuth()
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get('members')
  @RequirePermission('members.read')
  list(
    @CurrentTenant() tenantId: string,
    @Query('status', new ParseEnumPipe(MemberStatus, { optional: true }))
    status?: MemberStatus,
  ): Promise<MemberDetail[]> {
    return this.membersService.list(tenantId, { status });
  }

  /**
   * Estado de cuenta del afiliado autenticado (CU-AFI-005).
   *
   * @remarks Default `coverage=current`: solo packs ACTIVE vigentes hoy (DB).
   * Historial completo → `coverage=all` (futuro: historial de compras en app).
   */
  @Get('me/account')
  getMine(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Query('status', new ParseEnumPipe(ContractStatus, { optional: true }))
    contractStatus?: ContractStatus,
    @Query('coverage') coverage?: string,
  ): Promise<MemberAccountDetail> {
    if (user.profileType !== 'MEMBER') {
      throw new ForbiddenException('Member profile required');
    }
    const scope = coverage === 'all' ? 'all' : 'current';
    return this.membersService.getAccount(tenantId, user.userId, {
      contractStatus,
      coverage: scope,
    });
  }

  @Get('members/:memberId/account')
  @RequirePermission('members.read')
  getAccount(
    @CurrentTenant() tenantId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Query('status', new ParseEnumPipe(ContractStatus, { optional: true }))
    contractStatus?: ContractStatus,
    @Query('coverage') coverage?: string,
  ): Promise<MemberAccountDetail> {
    const scope = coverage === 'current' ? 'current' : 'all';
    return this.membersService.getAccount(tenantId, memberId, {
      contractStatus,
      coverage: scope,
    });
  }

  @Get('members/:memberId')
  @RequirePermission('members.read')
  findOne(
    @CurrentTenant() tenantId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
  ): Promise<MemberDetail> {
    return this.membersService.findOne(tenantId, memberId);
  }

  @Post('members')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('members.write')
  create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateMemberDto,
  ): Promise<MemberDetail> {
    return this.membersService.create(tenantId, dto, toAuditActor(user));
  }

  @Patch('members/:memberId')
  @RequirePermission('members.write')
  update(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Body() dto: UpdateMemberDto,
  ): Promise<MemberDetail> {
    return this.membersService.update(
      tenantId,
      memberId,
      dto,
      toAuditActor(user),
    );
  }

  @Patch('members/:memberId/status')
  @RequirePermission('members.deactivate')
  updateStatus(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Param('memberId', ParseUUIDPipe) memberId: string,
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
