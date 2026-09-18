import { Controller, Get, Query } from '@nestjs/common';
import { RequirePermission } from '../roles/decorators/require-permission.decorator';
import { CurrentTenant } from '../tenant/decorators/current-tenant.decorator';
import { RequireTenantAuth } from '../tenant/decorators/require-tenant-auth.decorator';
import { ExpirationsQueryDto } from './dto/expirations-query.dto';
import { ExpirationsService } from './expirations.service';
import { ExpirationsList } from './expirations.types';

/**
 * Cola de vencimientos MONTHLY para recepción.
 *
 * @remarks Requiere `members.read`. No es `reports.read`.
 */
@Controller('expirations')
@RequireTenantAuth()
export class ExpirationsController {
  constructor(private readonly expirations: ExpirationsService) {}

  @Get()
  @RequirePermission('members.read')
  list(
    @CurrentTenant() tenantId: string,
    @Query() query: ExpirationsQueryDto,
  ): Promise<ExpirationsList> {
    return this.expirations.list(tenantId, query);
  }
}
