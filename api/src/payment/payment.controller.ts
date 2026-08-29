import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { RequireTenantAuth } from '../tenant/decorators/require-tenant-auth.decorator';
import { CurrentTenant } from '../tenant/decorators/current-tenant.decorator';
import { RequirePermission } from '../roles/decorators/require-permission.decorator';
import { OnlinePaymentService } from './online-payment.service';
import { CreateMpCartCheckoutDto } from './dto/create-mp-cart-checkout.dto';
import { MpCartCheckoutResult } from './payment.types';

/**
 * Checkout de pagos online (Mercado Pago).
 *
 * @remarks Solo cart (Caja) — endpoint para iniciar checkout de carrito MP.
 */
@Controller()
@RequireTenantAuth()
export class PaymentController {
  constructor(private readonly onlinePayment: OnlinePaymentService) {}

  @Post('members/:memberId/transaction-items/mp/cart')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('members.write')
  startStaffCartCheckout(
    @CurrentTenant() tenantId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Body() dto: CreateMpCartCheckoutDto,
  ): Promise<MpCartCheckoutResult> {
    return this.onlinePayment.startCartCheckout(tenantId, memberId, dto);
  }
}
