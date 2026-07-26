import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { RequireSuperAuth } from '../auth/decorators/require-super-auth.decorator';
import { CashRegisterService } from './cash-register.service';
import { CashDayDetail } from './cash-register.types';
import { GetCashDayQueryDto } from './dto/cash-day-query.dto';

/**
 * Caja del día por tenant (Super Admin).
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
}
