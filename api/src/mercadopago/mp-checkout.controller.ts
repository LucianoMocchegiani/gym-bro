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
import { RequirePermission } from '../roles/decorators/require-permission.decorator';
import { CurrentTenant } from '../tenant/decorators/current-tenant.decorator';
import { RequireTenantAuth } from '../tenant/decorators/require-tenant-auth.decorator';
import { CreateMpCheckoutDto } from './dto/create-mp-checkout.dto';
import { CreateMpDropInCheckoutDto } from './dto/create-mp-drop-in-checkout.dto';
import { MpCheckoutService } from './mp-checkout.service';
import { MpCheckoutResult } from './mp-checkout.types';

/**
 * Checkout MP Member + Staff (pack y drop-in).
 *
 * @remarks CU-PAG-001 / CU-RES-001/002. Requiere cuenta MP conectada.
 */
@Controller()
@RequireTenantAuth()
export class MpCheckoutController {
  constructor(private readonly checkout: MpCheckoutService) {}

  @Post('me/payments/mp/checkout')
  @HttpCode(HttpStatus.CREATED)
  startMyPackCheckout(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateMpCheckoutDto,
  ): Promise<MpCheckoutResult> {
    if (user.profileType !== 'MEMBER') {
      throw new ForbiddenException('Member profile required');
    }
    return this.checkout.startPackCheckout(tenantId, user.userId, dto);
  }

  @Post('me/payments/mp/drop-in-checkout')
  @HttpCode(HttpStatus.CREATED)
  startMyDropInCheckout(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateMpDropInCheckoutDto,
  ): Promise<MpCheckoutResult> {
    if (user.profileType !== 'MEMBER') {
      throw new ForbiddenException('Member profile required');
    }
    return this.checkout.startDropInCheckout(tenantId, user.userId, dto);
  }

  @Post('members/:memberId/payments/mp/checkout')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('members.write')
  startStaffPackCheckout(
    @CurrentTenant() tenantId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Body() dto: CreateMpCheckoutDto,
  ): Promise<MpCheckoutResult> {
    return this.checkout.startPackCheckout(tenantId, memberId, dto);
  }

  @Post('members/:memberId/payments/mp/drop-in-checkout')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('reservations.write')
  startStaffDropInCheckout(
    @CurrentTenant() tenantId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Body() dto: CreateMpDropInCheckoutDto,
  ): Promise<MpCheckoutResult> {
    return this.checkout.startDropInCheckout(tenantId, memberId, dto);
  }
}
