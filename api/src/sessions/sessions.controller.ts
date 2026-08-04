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
  Query,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { toAuditActor } from '../audit/to-audit-actor';
import { ListResult } from '../common/list';
import { RequirePermission } from '../roles/decorators/require-permission.decorator';
import { CurrentTenant } from '../tenant/decorators/current-tenant.decorator';
import { RequireTenantAuth } from '../tenant/decorators/require-tenant-auth.decorator';
import {
  CreateSessionDto,
  ExpandSessionCapacityDto,
  ListSessionsQueryDto,
  UpdateSessionDto,
} from './dto/session.dto';
import { SessionsService } from './sessions.service';
import { SessionDetail } from './sessions.types';

/**
 * Sesiones puntuales del gym (staff).
 *
 * @remarks CU-SER-003 / CU-SER-005. Requiere `sessions.write` (lectura y mutación en MVP).
 */
@Controller('sessions')
@RequireTenantAuth()
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get()
  @RequirePermission('sessions.write')
  list(
    @CurrentTenant() tenantId: string,
    @Query() query: ListSessionsQueryDto,
  ): Promise<ListResult<SessionDetail>> {
    return this.sessionsService.list(tenantId, query);
  }

  @Get(':sessionId')
  @RequirePermission('sessions.write')
  findOne(
    @CurrentTenant() tenantId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ): Promise<SessionDetail> {
    return this.sessionsService.findOne(tenantId, sessionId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('sessions.write')
  create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateSessionDto,
  ): Promise<SessionDetail> {
    return this.sessionsService.create(tenantId, dto, toAuditActor(user));
  }

  @Patch(':sessionId/capacity')
  @RequirePermission('sessions.write')
  expandCapacity(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
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
  @RequirePermission('sessions.write')
  update(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
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
