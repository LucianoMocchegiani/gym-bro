import { Module, forwardRef } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentModule } from '../payment/payment.module';
import { RolesModule } from '../roles/roles.module';
import { DebitController } from './debit.controller';
import { DebitService } from './debit.service';

/**
 * Débito automático MONTHLY (suscripción MP + Caja).
 */
@Module({
  imports: [
    AuthModule,
    RolesModule,
    AuditModule,
    NotificationsModule,
    forwardRef(() => PaymentModule),
  ],
  controllers: [DebitController],
  providers: [DebitService],
  exports: [DebitService],
})
export class DebitModule {}
