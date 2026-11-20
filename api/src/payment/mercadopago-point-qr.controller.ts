import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../roles/decorators/require-permission.decorator';
import { CurrentTenant } from '../tenant/decorators/current-tenant.decorator';
import { RequireTenantAuth } from '../tenant/decorators/require-tenant-auth.decorator';
import { CreateMpCartCheckoutDto } from './dto/create-mp-cart-checkout.dto';
import { MpPointQrService } from './mp-point-qr.service';

@Controller()
@RequireTenantAuth()
export class MercadoPagoPointQrController {
  constructor(private readonly qrCheckout: MpPointQrService) {}

  @Post('members/:memberId/transaction-items/mp/qr/cart')
  @RequirePermission('members.write')
  startStaffQrCheckout(
    @CurrentTenant() tenantId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateMpCartCheckoutDto,
  ) {
    if (user.profileType !== 'STAFF') {
      throw new ForbiddenException('Staff profile required');
    }
    return this.qrCheckout.startStaffCart(tenantId, memberId, dto, user.userId);
  }

  @Get('transactions/:transactionId/mp-qr-order')
  @RequirePermission('members.read')
  getQrOrderStatus(
    @CurrentTenant() tenantId: string,
    @Param('transactionId', ParseUUIDPipe) transactionId: string,
  ) {
    return this.qrCheckout.getOrderStatus(tenantId, transactionId);
  }
}
