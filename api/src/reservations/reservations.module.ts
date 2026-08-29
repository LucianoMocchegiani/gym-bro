import { Module, forwardRef } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { PaymentModule } from '../payment/payment.module';
import { RolesModule } from '../roles/roles.module';
import { SessionsModule } from '../sessions/sessions.module';
import { TenantSettingsModule } from '../tenant-settings/tenant-settings.module';
import { WaitlistModule } from '../waitlist/waitlist.module';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';
import { SuperReservationsController } from './super-reservations.controller';

/**
 * Reservas con crédito, drop-in y cancelación (E4).
 *
 * @remarks
 * El pago (CASH o STUB) se delega a CashPaymentService.
 * MP se confirma vía webhook → WebhookPaymentService → ReservationsService.confirmDropInFromApprovedPayment.
 */
@Module({
  imports: [
    AuthModule,
    RolesModule,
    AuditModule,
    TenantSettingsModule,
    WaitlistModule,
    SessionsModule,
    forwardRef(() => PaymentModule),
  ],
  controllers: [ReservationsController, SuperReservationsController],
  providers: [ReservationsService],
  exports: [ReservationsService],
})
export class ReservationsModule {}
