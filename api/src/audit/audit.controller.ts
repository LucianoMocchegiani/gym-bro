import { Controller, Get, Query } from '@nestjs/common';
import { ListResult } from '../common/list';
import { RequirePermission } from '../roles/decorators/require-permission.decorator';
import { CurrentTenant } from '../tenant/decorators/current-tenant.decorator';
import { RequireTenantAuth } from '../tenant/decorators/require-tenant-auth.decorator';
import { AuditService } from './audit.service';
import { AuditEventDetail } from './audit.types';
import { ListAuditEventsQueryDto } from './dto/list-audit-events.dto';

/**
 * Lectura de auditoría del tenant del JWT staff.
 *
 * @remarks CU-ROL-007. Requiere `audit.read`.
 */
@Controller('audit-events')
@RequireTenantAuth()
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @RequirePermission('audit.read')
  list(
    @CurrentTenant() tenantId: string,
    @Query() query: ListAuditEventsQueryDto,
  ): Promise<ListResult<AuditEventDetail>> {
    return this.auditService.listByTenant(tenantId, query);
  }
}
