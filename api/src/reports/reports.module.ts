import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RolesModule } from '../roles/roles.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

/**
 * Reportes mínimos (E11): resumen afiliados, packs, ingresos y puerta.
 */
@Module({
  imports: [AuthModule, RolesModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
