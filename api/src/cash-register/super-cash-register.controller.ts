import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequireSuperAuth } from '../auth/decorators/require-super-auth.decorator';
import { toAuditActor } from '../audit/to-audit-actor';
import { CashRegisterService } from './cash-register.service';
import { CashDayDetail } from './cash-register.types';
import { GetCashDayQueryDto } from './dto/cash-day-query.dto';
import { ReconcileCashDayDto } from './dto/reconcile-cash-day.dto';

/**
 * Caja del día y arqueo por tenant (Super Admin).
 */
@Controller('tenants/:tenantId/cash-register')
@RequireSuperAuth()
export class SuperCashRegisterController {
  constructor(private readonly cashRegister: CashRegisterService) {}

  @Get('day')
  getDay(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Query() query: GetCashDayQueryDto,
  ): Promise<CashDayDetail> {
    return this.cashRegister.getDay(tenantId, query.date);
  }

  @Post('day/reconcile')
  @HttpCode(HttpStatus.CREATED)
  reconcile(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: ReconcileCashDayDto,
  ): Promise<CashDayDetail> {
    return this.cashRegister.reconcileDay(tenantId, dto, toAuditActor(user));
  }
}
