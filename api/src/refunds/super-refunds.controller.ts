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
import { ListResult } from '../common/list';
import { ExecuteRefundDto, ListRefundRequestsQueryDto } from './dto/refund.dto';
import { RefundsService } from './refunds.service';
import { RefundExecutionDetail, RefundRequestDetail } from './refunds.types';

/**
 * Devoluciones por tenant (Super Admin).
 */
@Controller('tenants/:tenantId')
@RequireSuperAuth()
export class SuperRefundsController {
  constructor(private readonly refunds: RefundsService) {}

  @Get('refund-requests')
  list(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Query() query: ListRefundRequestsQueryDto,
  ): Promise<ListResult<RefundRequestDetail>> {
    return this.refunds.listForTenant(tenantId, query);
  }

  @Post('payments/:paymentId/refunds')
  @HttpCode(HttpStatus.CREATED)
  execute(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: ExecuteRefundDto,
  ): Promise<RefundExecutionDetail> {
    return this.refunds.execute(tenantId, paymentId, dto, toAuditActor(user));
  }
}
