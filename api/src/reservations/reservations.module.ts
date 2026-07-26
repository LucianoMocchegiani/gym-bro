import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { RolesModule } from '../roles/roles.module';
import { TenantSettingsModule } from '../tenant-settings/tenant-settings.module';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';
import { SuperReservationsController } from './super-reservations.controller';

/**
 * Reservas con crédito y cancelación con ventana (E4).
 */
@Module({
  imports: [AuthModule, RolesModule, AuditModule, TenantSettingsModule],
  controllers: [ReservationsController, SuperReservationsController],
  providers: [ReservationsService],
  exports: [ReservationsService],
})
export class ReservationsModule {}
