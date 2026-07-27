import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { RefundRequestStatus } from '@prisma/client';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequireSuperAuth } from '../auth/decorators/require-super-auth.decorator';
import { toAuditActor } from '../audit/to-audit-actor';
import { ExecuteRefundDto } from './dto/refund.dto';
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
    @Query('status', new ParseEnumPipe(RefundRequestStatus, { optional: true }))
    status?: RefundRequestStatus,
  ): Promise<RefundRequestDetail[]> {
    return this.refunds.listForTenant(tenantId, status);
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
