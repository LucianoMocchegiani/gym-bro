import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { CashRegisterModule } from '../cash-register/cash-register.module';
import { RolesModule } from '../roles/roles.module';
import { TenantSettingsModule } from '../tenant-settings/tenant-settings.module';
import { WaitlistModule } from '../waitlist/waitlist.module';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';
import { SuperReservationsController } from './super-reservations.controller';

/**
 * Reservas con crédito, drop-in y cancelación (E4).
 */
@Module({
  imports: [
    AuthModule,
    RolesModule,
    AuditModule,
    TenantSettingsModule,
    WaitlistModule,
    CashRegisterModule,
  ],
  controllers: [ReservationsController, SuperReservationsController],
  providers: [ReservationsService],
  exports: [ReservationsService],
})
export class ReservationsModule {}
