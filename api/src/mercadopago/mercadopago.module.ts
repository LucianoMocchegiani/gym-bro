import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { ContractsModule } from '../contracts/contracts.module';
import { RolesModule } from '../roles/roles.module';
import { HttpMpAccountAdapter } from './http-mp-account.adapter';
import { MercadoPagoAccountController } from './mercadopago-account.controller';
import { MercadoPagoAccountService } from './mercadopago-account.service';
import { MP_ACCOUNT_PORT } from './mp-account.port';
import { MpCheckoutController } from './mp-checkout.controller';
import { MpCheckoutService } from './mp-checkout.service';
import { MpWebhookController } from './mp-webhook.controller';
import { MpWebhookService } from './mp-webhook.service';
import { SuperMercadoPagoAccountController } from './super-mercadopago-account.controller';

/**
 * Mercado Pago: cuenta del gym + checkout pack + webhook (E5).
 */
@Module({
  imports: [AuthModule, RolesModule, AuditModule, ContractsModule],
  controllers: [
    MercadoPagoAccountController,
    SuperMercadoPagoAccountController,
    MpCheckoutController,
    MpWebhookController,
  ],
  providers: [
    MercadoPagoAccountService,
    MpCheckoutService,
    MpWebhookService,
    HttpMpAccountAdapter,
    {
      provide: MP_ACCOUNT_PORT,
      useExisting: HttpMpAccountAdapter,
    },
  ],
  exports: [MercadoPagoAccountService, MP_ACCOUNT_PORT],
})
export class MercadoPagoModule {}
