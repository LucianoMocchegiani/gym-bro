import {
  Controller,
  Get,
  Post,
  Body,
  Query,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../roles/decorators/require-permission.decorator';
import { CurrentTenant } from '../tenant/decorators/current-tenant.decorator';
import { RequireTenantAuth } from '../tenant/decorators/require-tenant-auth.decorator';
import { toAuditActor } from '../audit/to-audit-actor';
import { PaymentRegisterService } from './register.service';
import { ReconcileCashDayDto } from './dto/reconcile-cash-day.dto';
import { CashDayDetail } from './register.types';

@Controller()
@RequireTenantAuth()
export class PaymentRegisterController {
  constructor(private readonly register: PaymentRegisterService) {}

  @Get('payment-register/day')
  @RequirePermission('cashier.operate')
  getDay(
    @CurrentTenant() tenantId: string,
    @Query('date') date?: string,
  ): Promise<CashDayDetail> {
    return this.register.getDay(tenantId, date);
  }

  @Post('payment-register/day/reconcile')
  @RequirePermission('cashier.operate')
  reconcileDay(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: ReconcileCashDayDto,
  ): Promise<CashDayDetail> {
    return this.register.reconcileDay(tenantId, dto, toAuditActor(user));
  }
}
