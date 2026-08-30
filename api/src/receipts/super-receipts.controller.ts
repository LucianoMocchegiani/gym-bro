import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { RequireSuperAuth } from '../auth/decorators/require-super-auth.decorator';
import { ListQueryDto, ListResult } from '../common/list';
import { ReceiptsService } from './receipts.service';
import { ReceiptDetail } from './receipts.types';

/**
 * Comprobantes por tenant (Super Admin).
 */
@Controller('tenants/:tenantId')
@RequireSuperAuth()
export class SuperReceiptsController {
  constructor(private readonly receipts: ReceiptsService) {}

  @Get('members/:memberId/receipts')
  listByMember(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Query() query: ListQueryDto,
  ): Promise<ListResult<ReceiptDetail>> {
    return this.receipts.listByMember(tenantId, memberId, query);
  }

  @Get('transactions/:transactionId/receipt')
  findByTransaction(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('transactionId', ParseUUIDPipe) transactionId: string,
  ): Promise<ReceiptDetail> {
    return this.receipts.findByTransactionId(tenantId, transactionId);
  }
}
