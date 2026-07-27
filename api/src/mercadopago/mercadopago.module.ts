import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { RolesModule } from '../roles/roles.module';
import { HttpMpAccountAdapter } from './http-mp-account.adapter';
import { MP_ACCOUNT_PORT } from './mp-account.port';
import { MercadoPagoAccountController } from './mercadopago-account.controller';
import { MercadoPagoAccountService } from './mercadopago-account.service';
import { SuperMercadoPagoAccountController } from './super-mercadopago-account.controller';

/**
 * Cuenta Mercado Pago del gym (E5 / CU-PAG-006).
 */
@Module({
  imports: [AuthModule, RolesModule, AuditModule],
  controllers: [
    MercadoPagoAccountController,
    SuperMercadoPagoAccountController,
  ],
  providers: [
    MercadoPagoAccountService,
    HttpMpAccountAdapter,
    {
      provide: MP_ACCOUNT_PORT,
      useExisting: HttpMpAccountAdapter,
    },
  ],
  exports: [MercadoPagoAccountService, MP_ACCOUNT_PORT],
})
export class MercadoPagoModule {}
