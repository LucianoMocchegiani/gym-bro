import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { CashRegisterModule } from '../cash-register/cash-register.module';
import { MercadoPagoModule } from '../mercadopago/mercadopago.module';
import { RolesModule } from '../roles/roles.module';
import { WaitlistModule } from '../waitlist/waitlist.module';
import { RefundsController } from './refunds.controller';
import { RefundsService } from './refunds.service';
import { SuperRefundsController } from './super-refunds.controller';

/**
 * Devoluciones y reembolsos (E5 / CU-PAG-004..007).
 */
@Module({
  imports: [
    AuthModule,
    RolesModule,
    AuditModule,
    CashRegisterModule,
    MercadoPagoModule,
    WaitlistModule,
  ],
  controllers: [RefundsController, SuperRefundsController],
  providers: [RefundsService],
  exports: [RefundsService],
})
export class RefundsModule {}
