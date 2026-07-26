import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuditActor } from '../audit/audit.types';
import { toAuditActor } from '../audit/to-audit-actor';
import { RequirePermission } from '../roles/decorators/require-permission.decorator';
import { CurrentTenant } from '../tenant/decorators/current-tenant.decorator';
import { RequireTenantAuth } from '../tenant/decorators/require-tenant-auth.decorator';
import { JoinWaitlistDto, LeaveWaitlistDto } from './dto/waitlist.dto';
import { WaitlistService } from './waitlist.service';
import { WaitlistEntryDetail } from './waitlist.types';

/**
 * Lista de espera (staff + afiliado).
 *
 * @remarks CU-RES-004. Staff: `reservations.write`.
 */
@Controller()
@RequireTenantAuth()
export class WaitlistController {
  constructor(private readonly waitlistService: WaitlistService) {}

  @Post('me/waitlist')
  @HttpCode(HttpStatus.CREATED)
  joinMine(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: JoinWaitlistDto,
  ): Promise<WaitlistEntryDetail> {
    if (user.profileType !== 'MEMBER') {
      throw new ForbiddenException('Member profile required');
    }
    return this.waitlistService.join(
      tenantId,
      user.userId,
      dto,
      this.memberActor(user),
    );
  }

  @Get('me/waitlist')
  listMine(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<WaitlistEntryDetail[]> {
    if (user.profileType !== 'MEMBER') {
      throw new ForbiddenException('Member profile required');
    }
    return this.waitlistService.listByMember(tenantId, user.userId);
  }

  @Patch('me/waitlist/:entryId/status')
  leaveMine(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Param('entryId', ParseUUIDPipe) entryId: string,
    @Body() dto: LeaveWaitlistDto,
  ): Promise<WaitlistEntryDetail> {
    if (user.profileType !== 'MEMBER') {
      throw new ForbiddenException('Member profile required');
    }
    return this.waitlistService.leave(
      tenantId,
      entryId,
      dto,
      this.memberActor(user),
      user.userId,
    );
  }

  @Post('members/:memberId/waitlist')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('reservations.write')
  joinForMember(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Body() dto: JoinWaitlistDto,
  ): Promise<WaitlistEntryDetail> {
    return this.waitlistService.join(
      tenantId,
      memberId,
      dto,
      toAuditActor(user),
    );
  }

  @Get('members/:memberId/waitlist')
  @RequirePermission('reservations.write')
  listByMember(
    @CurrentTenant() tenantId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
  ): Promise<WaitlistEntryDetail[]> {
    return this.waitlistService.listByMember(tenantId, memberId);
  }

  @Get('sessions/:sessionId/waitlist')
  @RequirePermission('reservations.write')
  listBySession(
    @CurrentTenant() tenantId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ): Promise<WaitlistEntryDetail[]> {
    return this.waitlistService.listBySession(tenantId, sessionId);
  }

  @Patch('waitlist/:entryId/status')
  @RequirePermission('reservations.write')
  leave(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Param('entryId', ParseUUIDPipe) entryId: string,
    @Body() dto: LeaveWaitlistDto,
  ): Promise<WaitlistEntryDetail> {
    return this.waitlistService.leave(
      tenantId,
      entryId,
      dto,
      toAuditActor(user),
    );
  }

  private memberActor(user: AuthUser): AuditActor {
    return { profileType: 'MEMBER', userId: user.userId };
  }
}
