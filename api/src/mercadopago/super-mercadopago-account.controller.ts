import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequireSuperAuth } from '../auth/decorators/require-super-auth.decorator';
import { toAuditActor } from '../audit/to-audit-actor';
import { UpsertMercadoPagoAccountDto } from './dto/upsert-mercadopago-account.dto';
import { MercadoPagoAccountService } from './mercadopago-account.service';
import {
  MercadoPagoAccountStatus,
  MercadoPagoAccountTestResult,
} from './mercadopago-account.types';

/**
 * Cuenta Mercado Pago por tenant (Super Admin).
 */
@Controller('tenants/:tenantId/mercadopago/account')
@RequireSuperAuth()
export class SuperMercadoPagoAccountController {
  constructor(private readonly accounts: MercadoPagoAccountService) {}

  @Get()
  getStatus(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
  ): Promise<MercadoPagoAccountStatus> {
    return this.accounts.getStatus(tenantId);
  }

  @Put()
  upsert(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpsertMercadoPagoAccountDto,
  ): Promise<MercadoPagoAccountStatus> {
    return this.accounts.upsert(tenantId, dto, toAuditActor(user));
  }

  @Post('test')
  @HttpCode(HttpStatus.OK)
  test(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<MercadoPagoAccountTestResult> {
    return this.accounts.test(tenantId, toAuditActor(user));
  }

  @Delete()
  disconnect(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<MercadoPagoAccountStatus> {
    return this.accounts.disconnect(tenantId, toAuditActor(user));
  }
}
