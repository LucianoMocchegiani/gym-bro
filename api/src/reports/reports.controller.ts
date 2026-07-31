import { Controller, Get, Query } from '@nestjs/common';
import { RequirePermission } from '../roles/decorators/require-permission.decorator';
import { CurrentTenant } from '../tenant/decorators/current-tenant.decorator';
import { RequireTenantAuth } from '../tenant/decorators/require-tenant-auth.decorator';
import { ReportsSummaryQueryDto } from './dto/reports-summary-query.dto';
import { ReportsService } from './reports.service';
import { ReportsSummary } from './reports.types';

/**
 * Reportes mínimos del gym (staff).
 *
 * @remarks E11. Requiere `reports.read`.
 */
@Controller('reports')
@RequireTenantAuth()
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('summary')
  @RequirePermission('reports.read')
  summary(
    @CurrentTenant() tenantId: string,
    @Query() query: ReportsSummaryQueryDto,
  ): Promise<ReportsSummary> {
    return this.reports.getSummary(tenantId, query.from, query.to);
  }
}
