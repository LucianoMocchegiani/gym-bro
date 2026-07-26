import {
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../roles/decorators/require-permission.decorator';
import { CurrentTenant } from '../tenant/decorators/current-tenant.decorator';
import { RequireTenantAuth } from '../tenant/decorators/require-tenant-auth.decorator';
import { ReceiptsService } from './receipts.service';
import { ReceiptDetail } from './receipts.types';

/**
 * Comprobantes internos (staff y afiliado).
 *
 * @remarks RN-PAG-009. Staff: `members.read`. Member: solo propios.
 */
@Controller()
@RequireTenantAuth()
export class ReceiptsController {
  constructor(private readonly receipts: ReceiptsService) {}

  @Get('me/receipts')
  listMine(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<ReceiptDetail[]> {
    if (user.profileType !== 'MEMBER') {
      throw new ForbiddenException('Member profile required');
    }
    return this.receipts.listByMember(tenantId, user.userId);
  }

  @Get('me/receipts/:receiptId')
  findMine(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Param('receiptId', ParseUUIDPipe) receiptId: string,
  ): Promise<ReceiptDetail> {
    if (user.profileType !== 'MEMBER') {
      throw new ForbiddenException('Member profile required');
    }
    return this.receipts.findOne(tenantId, receiptId, {
      ownerMemberId: user.userId,
    });
  }

  @Get('members/:memberId/receipts')
  @RequirePermission('members.read')
  listByMember(
    @CurrentTenant() tenantId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
  ): Promise<ReceiptDetail[]> {
    return this.receipts.listByMember(tenantId, memberId);
  }

  @Get('payments/:paymentId/receipt')
  @RequirePermission('members.read')
  findByPayment(
    @CurrentTenant() tenantId: string,
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
  ): Promise<ReceiptDetail> {
    return this.receipts.findByPayment(tenantId, paymentId);
  }
}
