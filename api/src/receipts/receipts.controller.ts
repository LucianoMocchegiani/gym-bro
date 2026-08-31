import {
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ListQueryDto, ListResult } from '../common/list';
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
    @Query() query: ListQueryDto,
  ): Promise<ListResult<ReceiptDetail>> {
    if (user.profileType !== 'MEMBER') {
      throw new ForbiddenException('Member profile required');
    }
    return this.receipts.listByMember(tenantId, user.userId, query);
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

  @Get('receipts/:receiptId')
  @RequirePermission('members.read')
  findOne(
    @CurrentTenant() tenantId: string,
    @Param('receiptId', ParseUUIDPipe) receiptId: string,
  ): Promise<ReceiptDetail> {
    return this.receipts.findOne(tenantId, receiptId);
  }

  @Get('transactions/:transactionId/receipt')
  @RequirePermission('members.read')
  findByTransaction(
    @CurrentTenant() tenantId: string,
    @Param('transactionId', ParseUUIDPipe) transactionId: string,
  ): Promise<ReceiptDetail> {
    return this.receipts.findByTransactionId(tenantId, transactionId);
  }
}
