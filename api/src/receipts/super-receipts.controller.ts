import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { RequireSuperAuth } from '../auth/decorators/require-super-auth.decorator';
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
  ): Promise<ReceiptDetail[]> {
    return this.receipts.listByMember(tenantId, memberId);
  }

  @Get('payments/:paymentId/receipt')
  findByPayment(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
  ): Promise<ReceiptDetail> {
    return this.receipts.findByPayment(tenantId, paymentId);
  }
}
