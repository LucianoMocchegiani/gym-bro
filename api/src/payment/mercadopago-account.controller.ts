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
import { CreateMercadoPagoQrSetupDto } from './dto/create-mercadopago-qr-setup.dto';
import { MercadoPagoAccountService } from './mercadopago-account.service';
import { MercadoPagoQrService } from './mercadopago-qr.service';
import {
  MercadoPagoAccountStatus,
  MercadoPagoAccountTestResult,
  MercadoPagoOAuthStartResult,
} from './mercadopago-account.types';
import { MercadoPagoOAuthService } from './mercadopago-oauth.service';
import { MercadoPagoQrSetupStatus } from './mercadopago-qr.service';

/**
 * Cuenta Mercado Pago del gym (staff).
 *
 * @remarks CU-PAG-006 / RN-PAG-001. Permiso peligroso `mp.connect`.
 */
@Controller('mercadopago/account')
@RequireTenantAuth()
export class MercadoPagoAccountController {
  constructor(
    private readonly accounts: MercadoPagoAccountService,
    private readonly oauth: MercadoPagoOAuthService,
    private readonly qr: MercadoPagoQrService,
  ) {}

  @Get()
  @RequirePermission('mp.connect')
  getStatus(
    @CurrentTenant() tenantId: string,
  ): Promise<MercadoPagoAccountStatus> {
    return this.accounts.getStatus(tenantId);
  }

  @Get('qr-setup')
  @RequirePermission('mp.connect')
  getQrSetup(
    @CurrentTenant() tenantId: string,
  ): Promise<MercadoPagoQrSetupStatus> {
    return this.qr.getSetup(tenantId);
  }

  @Post('qr-setup')
  @RequirePermission('mp.connect')
  createQrSetup(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateMercadoPagoQrSetupDto,
  ): Promise<MercadoPagoQrSetupStatus> {
    return this.qr.createSetup(tenantId, dto, toAuditActor(user));
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

  /**
   * URL de MP para «Conectar Mercado Pago» (el navegador navega ahí).
   */
  @Post('oauth/start')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('mp.connect')
  startOAuth(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<MercadoPagoOAuthStartResult> {
    return this.oauth.start(tenantId, toAuditActor(user));
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
