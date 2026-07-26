import { Controller, Get, Query } from '@nestjs/common';
import { RequirePermission } from '../roles/decorators/require-permission.decorator';
import { CurrentTenant } from '../tenant/decorators/current-tenant.decorator';
import { RequireTenantAuth } from '../tenant/decorators/require-tenant-auth.decorator';
import { CashRegisterService } from './cash-register.service';
import { CashDayDetail } from './cash-register.types';
import { GetCashDayQueryDto } from './dto/cash-day-query.dto';

/**
 * Caja del día (staff).
 *
 * @remarks RN-PAG-007 / RN-PAG-008. Permiso `cashier.operate`. Sin arqueo aún.
 */
@Controller('cash-register')
@RequireTenantAuth()
export class CashRegisterController {
  constructor(private readonly cashRegister: CashRegisterService) {}

  @Get('day')
  @RequirePermission('cashier.operate')
  getDay(
    @CurrentTenant() tenantId: string,
    @Query() query: GetCashDayQueryDto,
  ): Promise<CashDayDetail> {
    return this.cashRegister.getDay(tenantId, query.date);
  }
}
