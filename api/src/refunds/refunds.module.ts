import { Module, forwardRef } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { PaymentRegisterModule } from '../payment-register/payment-register.module';
import { PaymentModule } from '../payment/payment.module';
import { ReceiptsModule } from '../receipts/receipts.module';
import { RolesModule } from '../roles/roles.module';
import { WaitlistModule } from '../waitlist/waitlist.module';
import { RefundsController } from './refunds.controller';
import { RefundsService } from './refunds.service';
/**
 * Devoluciones y reembolsos (E5 / CU-PAG-004..007).
 */
@Module({
  imports: [
    AuthModule,
    RolesModule,
    AuditModule,
    PaymentRegisterModule,
    forwardRef(() => PaymentModule),
    ReceiptsModule,
    WaitlistModule,
  ],
  controllers: [RefundsController],
  providers: [RefundsService],
  exports: [RefundsService],
})
export class RefundsModule {}
