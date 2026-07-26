import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { toAuditActor } from '../audit/to-audit-actor';
import { RequirePermission } from '../roles/decorators/require-permission.decorator';
import { CurrentTenant } from '../tenant/decorators/current-tenant.decorator';
import { RequireTenantAuth } from '../tenant/decorators/require-tenant-auth.decorator';
import { CashRegisterService } from './cash-register.service';
import { CashDayDetail } from './cash-register.types';
import { GetCashDayQueryDto } from './dto/cash-day-query.dto';
import { ReconcileCashDayDto } from './dto/reconcile-cash-day.dto';

/**
 * Caja del día y arqueo (staff).
 *
 * @remarks RN-PAG-007 / RN-PAG-008 / CU-PAG-003. Permiso `cashier.operate`.
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

  @Post('day/reconcile')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('cashier.operate')
  reconcile(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: ReconcileCashDayDto,
  ): Promise<CashDayDetail> {
    return this.cashRegister.reconcileDay(tenantId, dto, toAuditActor(user));
  }
}
