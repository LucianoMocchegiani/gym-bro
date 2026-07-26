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
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequireSuperAuth } from '../auth/decorators/require-super-auth.decorator';
import { toAuditActor } from '../audit/to-audit-actor';
import { JoinWaitlistDto, LeaveWaitlistDto } from './dto/waitlist.dto';
import { WaitlistService } from './waitlist.service';
import { WaitlistEntryDetail } from './waitlist.types';

/**
 * Lista de espera por tenant (Super Admin).
 */
@Controller('tenants/:tenantId')
@RequireSuperAuth()
export class SuperWaitlistController {
  constructor(private readonly waitlistService: WaitlistService) {}

  @Post('members/:memberId/waitlist')
  @HttpCode(HttpStatus.CREATED)
  joinForMember(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @CurrentUser() user: AuthUser,
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
  listByMember(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
  ): Promise<WaitlistEntryDetail[]> {
    return this.waitlistService.listByMember(tenantId, memberId);
  }

  @Get('sessions/:sessionId/waitlist')
  listBySession(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ): Promise<WaitlistEntryDetail[]> {
    return this.waitlistService.listBySession(tenantId, sessionId);
  }

  @Patch('waitlist/:entryId/status')
  leave(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: LeaveWaitlistDto,
  ): Promise<WaitlistEntryDetail> {
    return this.waitlistService.leave(
      tenantId,
      entryId,
      dto,
      toAuditActor(user),
    );
  }
}
