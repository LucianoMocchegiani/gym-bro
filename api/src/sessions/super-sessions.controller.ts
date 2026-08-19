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
  CreateSessionDto,
  ExpandSessionCapacityDto,
  ListSessionsQueryDto,
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
    @Query() query: ListSessionsQueryDto,
  ): Promise<ListResult<SessionDetail>> {
    return this.sessionsService.list(tenantId, query);
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

  @Delete(':sessionId')
  remove(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @CurrentUser() user: AuthUser,
  ): ReturnType<SessionsService['remove']> {
    return this.sessionsService.remove(tenantId, sessionId, toAuditActor(user));
  }
}
