import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { RolesModule } from '../roles/roles.module';
import { TenantSettingsModule } from '../tenant-settings/tenant-settings.module';
import { WaitlistModule } from '../waitlist/waitlist.module';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';
/**
 * Reservas con crédito, drop-in y cancelación (E4).
 *
 * @remarks
 * Drop-in se cobra en Caja o Mercado Pago. `STUB` deshabilitado.
 * MP se confirma vía webhook → WebhookPaymentService → ReservationsService.confirmDropInFromApprovedPayment.
 */
@Module({
  imports: [
    AuthModule,
    RolesModule,
    AuditModule,
    TenantSettingsModule,
    WaitlistModule,
  ],
  controllers: [ReservationsController],
  providers: [ReservationsService],
  exports: [ReservationsService],
})
export class ReservationsModule {}
