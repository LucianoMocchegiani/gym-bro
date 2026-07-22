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
import { MemberStatus } from '@prisma/client';
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
import { MemberDetail } from './members.types';

/**
 * Afiliados del gym (staff autenticado).
 *
 * @remarks CU-AFI-001..003 / RN-ROL-007. Credencial SSI fuera de alcance.
 */
@Controller('members')
@RequireTenantAuth()
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  @RequirePermission('members.read')
  list(
    @CurrentTenant() tenantId: string,
    @Query('status', new ParseEnumPipe(MemberStatus, { optional: true }))
    status?: MemberStatus,
  ): Promise<MemberDetail[]> {
    return this.membersService.list(tenantId, { status });
  }

  @Get(':memberId')
  @RequirePermission('members.read')
  findOne(
    @CurrentTenant() tenantId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
  ): Promise<MemberDetail> {
    return this.membersService.findOne(tenantId, memberId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('members.write')
  create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateMemberDto,
  ): Promise<MemberDetail> {
    return this.membersService.create(tenantId, dto, toAuditActor(user));
  }

  @Patch(':memberId')
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

  @Patch(':memberId/status')
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
