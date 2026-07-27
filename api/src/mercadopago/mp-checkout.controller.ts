import {
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentTenant } from '../tenant/decorators/current-tenant.decorator';
import { RequireTenantAuth } from '../tenant/decorators/require-tenant-auth.decorator';
import { CreateMpCheckoutDto } from './dto/create-mp-checkout.dto';
import { MpCheckoutService } from './mp-checkout.service';
import { MpCheckoutResult } from './mp-checkout.types';

/**
 * Checkout MP del afiliado (pack).
 *
 * @remarks CU-PAG-001 / CU-CON-001. Requiere cuenta MP conectada.
 */
@Controller('me/payments/mp')
@RequireTenantAuth()
export class MpCheckoutController {
  constructor(private readonly checkout: MpCheckoutService) {}

  @Post('checkout')
  @HttpCode(HttpStatus.CREATED)
  startCheckout(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateMpCheckoutDto,
  ): Promise<MpCheckoutResult> {
    if (user.profileType !== 'MEMBER') {
      throw new ForbiddenException('Member profile required');
    }
    return this.checkout.startPackCheckout(tenantId, user.userId, dto);
  }
}
