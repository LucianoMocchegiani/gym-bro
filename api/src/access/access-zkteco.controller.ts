import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { AccessProvider } from '@prisma/client';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { toAuditActor } from '../audit/to-audit-actor';
import { RequirePermission } from '../roles/decorators/require-permission.decorator';
import { CurrentTenant } from '../tenant/decorators/current-tenant.decorator';
import { RequirePlatformModule } from '../tenant/decorators/require-platform-module.decorator';
import { RequireTenantAuth } from '../tenant/decorators/require-tenant-auth.decorator';
import { AccessIdentityLinksService } from './access-identity-links.service';
import { AccessZktecoService } from './access-zkteco.service';
import {
  AccessDoorConfig,
  AccessIdentityLinkDetail,
  AccessSubject,
  MyAccessCredential,
  ZktecoEventResult,
} from './access.types';
import { CreateAccessLinkDto } from './dto/create-access-link.dto';
import { ZktecoEventDto } from './dto/zkteco-event.dto';

@Controller()
@RequireTenantAuth()
@RequirePlatformModule('club')
export class AccessZktecoController {
  constructor(private readonly zkteco: AccessZktecoService, private readonly links: AccessIdentityLinksService) {}

  @Get('me/access-credential')
  async getMyCredential(@CurrentTenant() tenantId: string, @CurrentUser() user: AuthUser): Promise<MyAccessCredential> {
    if (user.profileType !== 'MEMBER' && user.profileType !== 'STAFF') throw new ForbiddenException('Member or staff profile required');
    const subject: AccessSubject = user.profileType === 'MEMBER'
      ? { kind: 'member', memberId: user.userId }
      : { kind: 'staff', staffUserId: user.userId };
    const { provider } = await this.zkteco.getDoorConfig(tenantId);
    return { provider, credentialIds: provider === AccessProvider.ZKTECO ? await this.links.listCredentialIds(tenantId, subject) : [] };
  }

  @Get('access/door')
  getDoor(@CurrentTenant() tenantId: string, @CurrentUser() user: AuthUser): Promise<AccessDoorConfig> {
    if (user.profileType !== 'STAFF') throw new ForbiddenException('Staff profile required');
    return this.zkteco.getDoorConfig(tenantId);
  }

  @Post('access/zkteco/events')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('access.verify')
  handleEvent(@CurrentTenant() tenantId: string, @CurrentUser() user: AuthUser, @Body() dto: ZktecoEventDto): Promise<ZktecoEventResult> {
    if (user.profileType !== 'STAFF') throw new ForbiddenException('Staff profile required');
    return this.zkteco.handleEvent(tenantId, dto, user.userId);
  }

  @Get('members/:memberId/access-links')
  @RequirePermission('members.read')
  listMemberLinks(@CurrentTenant() tenantId: string, @Param('memberId', ParseUUIDPipe) memberId: string): Promise<AccessIdentityLinkDetail[]> {
    return this.links.list(tenantId, { kind: 'member', memberId });
  }

  @Post('members/:memberId/access-links')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('members.write')
  createMemberLink(@CurrentTenant() tenantId: string, @CurrentUser() user: AuthUser, @Param('memberId', ParseUUIDPipe) memberId: string, @Body() dto: CreateAccessLinkDto): Promise<AccessIdentityLinkDetail> {
    return this.links.create(tenantId, { kind: 'member', memberId }, dto.externalId, toAuditActor(user));
  }

  @Delete('members/:memberId/access-links/:linkId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('members.write')
  removeMemberLink(@CurrentTenant() tenantId: string, @CurrentUser() user: AuthUser, @Param('memberId', ParseUUIDPipe) memberId: string, @Param('linkId', ParseUUIDPipe) linkId: string): Promise<void> {
    return this.links.remove(tenantId, { kind: 'member', memberId }, linkId, toAuditActor(user));
  }

  @Get('staff/:staffId/access-links')
  @RequirePermission('staff.read')
  listStaffLinks(@CurrentTenant() tenantId: string, @Param('staffId', ParseUUIDPipe) staffId: string): Promise<AccessIdentityLinkDetail[]> {
    return this.links.list(tenantId, { kind: 'staff', staffUserId: staffId });
  }

  @Post('staff/:staffId/access-links')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('staff.write')
  createStaffLink(@CurrentTenant() tenantId: string, @CurrentUser() user: AuthUser, @Param('staffId', ParseUUIDPipe) staffId: string, @Body() dto: CreateAccessLinkDto): Promise<AccessIdentityLinkDetail> {
    return this.links.create(tenantId, { kind: 'staff', staffUserId: staffId }, dto.externalId, toAuditActor(user));
  }

  @Delete('staff/:staffId/access-links/:linkId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('staff.write')
  removeStaffLink(@CurrentTenant() tenantId: string, @CurrentUser() user: AuthUser, @Param('staffId', ParseUUIDPipe) staffId: string, @Param('linkId', ParseUUIDPipe) linkId: string): Promise<void> {
    return this.links.remove(tenantId, { kind: 'staff', staffUserId: staffId }, linkId, toAuditActor(user));
  }
}
