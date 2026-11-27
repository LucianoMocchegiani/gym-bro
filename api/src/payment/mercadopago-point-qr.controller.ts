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
import { RequirePlatformModule } from '../tenant/decorators/require-platform-module.decorator';
import { RequireTenantAuth } from '../tenant/decorators/require-tenant-auth.decorator';
import { PlatformPlansService } from '../platform-plans/platform-plans.service';
import { assertMemberCartModules } from './member-cart-modules';
import { CreateMpPointQrCartCheckoutDto } from './dto/create-mp-point-qr-cart-checkout.dto';
import { MpPointQrService } from './mp-point-qr.service';
import { MpPointQrOrderDiagnosticService } from './mp-point-qr-order-diagnostic.service';

@Controller()
@RequireTenantAuth()
export class MercadoPagoPointQrController {
  constructor(
    private readonly qrCheckout: MpPointQrService,
    private readonly qrOrderDiagnostic: MpPointQrOrderDiagnosticService,
    private readonly platformPlans: PlatformPlansService,
  ) {}

  @Post('members/:memberId/transaction-items/mp/qr/cart')
  @RequirePlatformModule(['club', 'ecommerce'])
  @RequirePermission('members.write')
  async startStaffQrCheckout(
    @CurrentTenant() tenantId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateMpPointQrCartCheckoutDto,
  ) {
    if (user.profileType !== 'STAFF') {
      throw new ForbiddenException('Staff profile required');
    }
    assertMemberCartModules(
      await this.platformPlans.getTenantModules(tenantId),
      dto.items,
    );
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

  @Get('transactions/:transactionId/mp-qr-orders/:orderId/diagnostic')
  @RequirePermission('members.read')
  getQrOrderDiagnostic(
    @CurrentTenant() tenantId: string,
    @Param('transactionId', ParseUUIDPipe) transactionId: string,
    @Param('orderId') orderId: string,
    @CurrentUser() user: AuthUser,
  ) {
    if (user.profileType !== 'STAFF') {
      throw new ForbiddenException('Staff profile required');
    }
    return this.qrOrderDiagnostic.getOrderDiagnostic(
      tenantId,
      transactionId,
      orderId,
    );
  }
}
