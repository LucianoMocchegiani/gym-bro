import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { RequireSuperAuth } from '../auth/decorators/require-super-auth.decorator';
import { AuditService } from './audit.service';
import { AuditEventDetail } from './audit.types';
import { ListAuditEventsQueryDto } from './dto/list-audit-events.dto';

/**
 * Lectura de auditoría por tenant (Super Admin).
 *
 * @remarks Path: `/api/tenants/:tenantId/audit-events`.
 */
@Controller('tenants/:tenantId/audit-events')
@RequireSuperAuth()
export class SuperAuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  list(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Query() query: ListAuditEventsQueryDto,
  ): Promise<AuditEventDetail[]> {
    return this.auditService.listByTenant(tenantId, {
      limit: query.limit,
      action: query.action,
    });
  }
}
