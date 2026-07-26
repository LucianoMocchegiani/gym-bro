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
import { SessionStatus } from '@prisma/client';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequireSuperAuth } from '../auth/decorators/require-super-auth.decorator';
import { toAuditActor } from '../audit/to-audit-actor';
import {
  CreateSessionDto,
  ExpandSessionCapacityDto,
  UpdateSessionDto,
} from './dto/session.dto';
import { SessionsService } from './sessions.service';
import { SessionDetail } from './sessions.types';

/**
 * Sesiones por tenant (Super Admin).
 *
 * @remarks Path: `/api/tenants/:tenantId/sessions`. Incluye ampliar cupo (CU-SER-005).
 */
@Controller('tenants/:tenantId/sessions')
@RequireSuperAuth()
export class SuperSessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get()
  list(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Query('serviceId', new ParseUUIDPipe({ optional: true }))
    serviceId?: string,
    @Query('status', new ParseEnumPipe(SessionStatus, { optional: true }))
    status?: SessionStatus,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<SessionDetail[]> {
    return this.sessionsService.list(tenantId, {
      serviceId,
      status,
      from,
      to,
    });
  }

  @Get(':sessionId')
  findOne(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ): Promise<SessionDetail> {
    return this.sessionsService.findOne(tenantId, sessionId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateSessionDto,
  ): Promise<SessionDetail> {
    return this.sessionsService.create(tenantId, dto, toAuditActor(user));
  }

  @Patch(':sessionId/capacity')
  expandCapacity(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: ExpandSessionCapacityDto,
  ): Promise<SessionDetail> {
    return this.sessionsService.expandCapacity(
      tenantId,
      sessionId,
      dto,
      toAuditActor(user),
    );
  }

  @Patch(':sessionId')
  update(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateSessionDto,
  ): Promise<SessionDetail> {
    return this.sessionsService.update(
      tenantId,
      sessionId,
      dto,
      toAuditActor(user),
    );
  }
}
