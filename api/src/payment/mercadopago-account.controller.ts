import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { toAuditActor } from '../audit/to-audit-actor';
import { RequirePermission } from '../roles/decorators/require-permission.decorator';
import { CurrentTenant } from '../tenant/decorators/current-tenant.decorator';
import { RequireTenantAuth } from '../tenant/decorators/require-tenant-auth.decorator';
import { UpsertMercadoPagoAccountDto } from './dto/upsert-mercadopago-account.dto';
import { MercadoPagoAccountService } from './mercadopago-account.service';
import {
  MercadoPagoAccountStatus,
  MercadoPagoAccountTestResult,
} from './mercadopago-account.types';

/**
 * Cuenta Mercado Pago del gym (staff).
 *
 * @remarks CU-PAG-006 / RN-PAG-001. Permiso peligroso `mp.connect`.
 */
@Controller('mercadopago/account')
@RequireTenantAuth()
export class MercadoPagoAccountController {
  constructor(private readonly accounts: MercadoPagoAccountService) {}

  @Get()
  @RequirePermission('mp.connect')
  getStatus(
    @CurrentTenant() tenantId: string,
  ): Promise<MercadoPagoAccountStatus> {
    return this.accounts.getStatus(tenantId);
  }

  /**
   * Public key para Card Payment Brick en Caja (débito).
   */
  @Get('public-key')
  @RequirePermission('cashier.operate')
  async getPublicKey(
    @CurrentTenant() tenantId: string,
  ): Promise<{ publicKey: string }> {
    const publicKey = await this.accounts.getPublicKey(tenantId);
    return { publicKey };
  }

  @Put()
  @RequirePermission('mp.connect')
  upsert(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpsertMercadoPagoAccountDto,
  ): Promise<MercadoPagoAccountStatus> {
    return this.accounts.upsert(tenantId, dto, toAuditActor(user));
  }

  @Post('test')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('mp.connect')
  test(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<MercadoPagoAccountTestResult> {
    return this.accounts.test(tenantId, toAuditActor(user));
  }

  @Delete()
  @RequirePermission('mp.connect')
  disconnect(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<MercadoPagoAccountStatus> {
    return this.accounts.disconnect(tenantId, toAuditActor(user));
  }
}
