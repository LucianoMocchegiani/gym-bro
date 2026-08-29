import {
  Body,
  Controller,
  ForbiddenException,
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
import { toAuditActor } from '../audit/to-audit-actor';
import { ListResult } from '../common/list';
import { RequirePermission } from '../roles/decorators/require-permission.decorator';
import { CurrentTenant } from '../tenant/decorators/current-tenant.decorator';
import { RequireTenantAuth } from '../tenant/decorators/require-tenant-auth.decorator';
import {
  CreateRefundRequestDto,
  ExecuteRefundDto,
  ListRefundRequestsQueryDto,
} from './dto/refund.dto';
import { RefundsService } from './refunds.service';
import { RefundExecutionDetail, RefundRequestDetail } from './refunds.types';

/**
 * Devoluciones Member/Staff (CU-PAG-004 / CU-PAG-005 / CU-PAG-007).
 */
@Controller()
@RequireTenantAuth()
export class RefundsController {
  constructor(private readonly refunds: RefundsService) {}

  @Post('me/transaction-items/:transactionItemId/refund-requests')
  @HttpCode(HttpStatus.CREATED)
  requestMine(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Param('transactionItemId', ParseUUIDPipe) transactionItemId: string,
    @Body() dto: CreateRefundRequestDto,
  ): Promise<RefundRequestDetail> {
    if (user.profileType !== 'MEMBER') {
      throw new ForbiddenException('Member profile required');
    }
    return this.refunds.requestByMember(tenantId, user.userId, transactionItemId, dto, {
      profileType: 'MEMBER',
      userId: user.userId,
    });
  }

  @Get('me/refund-requests')
  listMine(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Query() query: ListRefundRequestsQueryDto,
  ): Promise<ListResult<RefundRequestDetail>> {
    if (user.profileType !== 'MEMBER') {
      throw new ForbiddenException('Member profile required');
    }
    return this.refunds.listMine(tenantId, user.userId, query);
  }

  @Get('refund-requests')
  @RequirePermission('transaction_items.refund')
  listTenant(
    @CurrentTenant() tenantId: string,
    @Query() query: ListRefundRequestsQueryDto,
  ): Promise<ListResult<RefundRequestDetail>> {
    return this.refunds.listForTenant(tenantId, query);
  }

  @Post('transaction-items/:transactionItemId/refunds')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('transaction_items.refund')
  execute(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Param('transactionItemId', ParseUUIDPipe) transactionItemId: string,
    @Body() dto: ExecuteRefundDto,
  ): Promise<RefundExecutionDetail> {
    return this.refunds.execute(tenantId, transactionItemId, dto, toAuditActor(user));
  }
}
