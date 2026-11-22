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
  UseGuards,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlatformTenantGuard } from '../auth/guards/platform-tenant.guard';
import { PermissionGuard } from '../roles/guards/permission.guard';
import { RequireTenantAuth } from '../tenant/decorators/require-tenant-auth.decorator';
import { CurrentTenant } from '../tenant/decorators/current-tenant.decorator';
import { RequirePermission } from '../roles/decorators/require-permission.decorator';
import { toAuditActor } from '../audit/to-audit-actor';
import { OnlinePaymentService } from './online-payment.service';
import { CashPaymentService } from './cash-payment.service';
import { CreateMpCartCheckoutDto } from './dto/create-mp-cart-checkout.dto';
import { CreateCashCartDto } from './dto/create-cash-cart.dto';
import { MpPaymentStatusService } from './mp-payment-status.service';
import { TenantSettingsService } from '../tenant-settings/tenant-settings.service';
import { bpsToPercent } from './cash-discount';
import {
  CashCartResult,
  MpCartCheckoutResult,
  MpPaymentStatusView,
} from './payment.types';

@Controller()
@RequireTenantAuth()
export class PaymentController {
  constructor(
    private readonly onlinePayment: OnlinePaymentService,
    private readonly cashPayment: CashPaymentService,
    private readonly mpPaymentStatus: MpPaymentStatusService,
    private readonly tenantSettings: TenantSettingsService,
  ) {}

  @Post('me/transaction-items/mp/cart')
  @HttpCode(HttpStatus.CREATED)
  startMemberCartCheckout(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateMpCartCheckoutDto,
  ): Promise<MpCartCheckoutResult> {
    if (user.profileType !== 'MEMBER') {
      throw new ForbiddenException('Member profile required');
    }
    return this.onlinePayment.startCartCheckout(
      tenantId,
      user.userId,
      dto,
      null,
    );
  }

  @Post('members/:memberId/transaction-items/mp/cart')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('members.write')
  startStaffCartCheckout(
    @CurrentTenant() tenantId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateMpCartCheckoutDto,
  ): Promise<MpCartCheckoutResult> {
    return this.onlinePayment.startCartCheckout(
      tenantId,
      memberId,
      dto,
      user.profileType === 'STAFF' ? user.userId : null,
    );
  }

  @Get('cash/discount-defaults')
  async getCashDiscountDefaults(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
  ) {
    if (user.profileType !== 'STAFF') {
      throw new ForbiddenException('Staff profile required');
    }
    const defaults =
      await this.tenantSettings.getCashDiscountDefaults(tenantId);
    return {
      cashDiscountPercent: bpsToPercent(defaults.cashBps),
      transferDiscountPercent: bpsToPercent(defaults.transferBps),
      qrPointDiscountPercent: bpsToPercent(defaults.qrPointBps),
      mpLinkDiscountPercent: bpsToPercent(defaults.mpLinkBps),
    };
  }

  @Post('members/:memberId/transaction-items/cash/cart')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('members.write')
  startCashCart(
    @CurrentTenant() tenantId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateCashCartDto,
  ): Promise<CashCartResult> {
    return this.cashPayment.startCashCart(
      tenantId,
      memberId,
      toAuditActor(user),
      dto,
    );
  }

  @Post('tenants/:billingTenantId/transaction-items/mp/cart')
  @RequirePermission('platform.tenants.write')
  @UseGuards(JwtAuthGuard, PlatformTenantGuard, PermissionGuard)
  startPlatformCartCheckout(
    @CurrentTenant() catalogTenantId: string,
    @Param('billingTenantId', ParseUUIDPipe) billingTenantId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateMpCartCheckoutDto,
  ): Promise<MpCartCheckoutResult> {
    return this.onlinePayment.startTenantCartCheckout(
      catalogTenantId,
      billingTenantId,
      dto,
      user.profileType === 'STAFF' ? user.userId : null,
    );
  }

  @Post('tenants/:billingTenantId/transaction-items/cash/cart')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('platform.tenants.write')
  @UseGuards(JwtAuthGuard, PlatformTenantGuard, PermissionGuard)
  startPlatformCashCart(
    @CurrentTenant() catalogTenantId: string,
    @Param('billingTenantId', ParseUUIDPipe) billingTenantId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateCashCartDto,
  ): Promise<CashCartResult> {
    return this.cashPayment.startTenantCashCart(
      catalogTenantId,
      billingTenantId,
      toAuditActor(user),
      dto,
    );
  }

  @Get('transactions/:transactionId/mp-payment')
  @RequirePermission('members.read')
  getMpPaymentStatus(
    @CurrentTenant() tenantId: string,
    @Param('transactionId', ParseUUIDPipe) transactionId: string,
  ): Promise<MpPaymentStatusView> {
    return this.mpPaymentStatus.getForTransaction(tenantId, transactionId);
  }
}
