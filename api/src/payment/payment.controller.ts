import {
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequireTenantAuth } from '../tenant/decorators/require-tenant-auth.decorator';
import { CurrentTenant } from '../tenant/decorators/current-tenant.decorator';
import { RequirePermission } from '../roles/decorators/require-permission.decorator';
import { toAuditActor } from '../audit/to-audit-actor';
import { OnlinePaymentService } from './online-payment.service';
import { CashPaymentService } from './cash-payment.service';
import { CreateMpCartCheckoutDto } from './dto/create-mp-cart-checkout.dto';
import { CreateCashCartDto } from './dto/create-cash-cart.dto';
import { CashCartResult, MpCartCheckoutResult } from './payment.types';

/**
 * Checkout de pagos: cart MP (Caja y afiliado) y cart CASH (solo Caja).
 *
 * @remarks CU-PAG-001. El afiliado no usa cash; `recordedByStaffId` queda null.
 */
@Controller()
@RequireTenantAuth()
export class PaymentController {
  constructor(
    private readonly onlinePayment: OnlinePaymentService,
    private readonly cashPayment: CashPaymentService,
  ) {}

  /**
   * Checkout MP self-service del afiliado (app): mismo body que Caja.
   *
   * @remarks JWT Member; `memberId` del token. Sin `members.write`.
   * @throws {ForbiddenException} Si el perfil no es MEMBER.
   */
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
    return this.onlinePayment.startCartCheckout(tenantId, user.userId, dto, null);
  }

  /**
   * Checkout MP de Caja: carrito a nombre del afiliado (`members.write`).
   */
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
}
