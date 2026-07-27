import {
  Body,
  Controller,
  ForbiddenException,
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
import { toAuditActor } from '../audit/to-audit-actor';
import { RequirePermission } from '../roles/decorators/require-permission.decorator';
import { CurrentTenant } from '../tenant/decorators/current-tenant.decorator';
import { RequireTenantAuth } from '../tenant/decorators/require-tenant-auth.decorator';
import { CreateRefundRequestDto, ExecuteRefundDto } from './dto/refund.dto';
import { RefundsService } from './refunds.service';
import { RefundExecutionDetail, RefundRequestDetail } from './refunds.types';

/**
 * Devoluciones Member/Staff (CU-PAG-004 / CU-PAG-005 / CU-PAG-007).
 */
@Controller()
@RequireTenantAuth()
export class RefundsController {
  constructor(private readonly refunds: RefundsService) {}

  @Post('me/payments/:paymentId/refund-requests')
  @HttpCode(HttpStatus.CREATED)
  requestMine(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
    @Body() dto: CreateRefundRequestDto,
  ): Promise<RefundRequestDetail> {
    if (user.profileType !== 'MEMBER') {
      throw new ForbiddenException('Member profile required');
    }
    return this.refunds.requestByMember(tenantId, user.userId, paymentId, dto, {
      profileType: 'MEMBER',
      userId: user.userId,
    });
  }

  @Get('me/refund-requests')
  listMine(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<RefundRequestDetail[]> {
    if (user.profileType !== 'MEMBER') {
      throw new ForbiddenException('Member profile required');
    }
    return this.refunds.listMine(tenantId, user.userId);
  }

  @Get('refund-requests')
  @RequirePermission('payments.refund')
  listTenant(
    @CurrentTenant() tenantId: string,
    @Query('status', new ParseEnumPipe(RefundRequestStatus, { optional: true }))
    status?: RefundRequestStatus,
  ): Promise<RefundRequestDetail[]> {
    return this.refunds.listForTenant(tenantId, status);
  }

  @Post('payments/:paymentId/refunds')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('payments.refund')
  execute(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
    @Body() dto: ExecuteRefundDto,
  ): Promise<RefundExecutionDetail> {
    return this.refunds.execute(tenantId, paymentId, dto, toAuditActor(user));
  }
}
