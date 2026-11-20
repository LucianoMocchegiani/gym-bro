import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlatformTenantGuard } from '../auth/guards/platform-tenant.guard';
import { PermissionGuard } from '../roles/guards/permission.guard';
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
    return this.qrCheckout.startStaffCart(
      tenantId,
      memberId,
      dto,
      user.profileType === 'STAFF' ? user.userId : '',
    );
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
