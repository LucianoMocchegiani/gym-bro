import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { RolesModule } from '../roles/roles.module';
import { ServicesController } from './services.controller';
import { ServicesService } from './services.service';
/**
 * Catálogo de servicios (ACCESO_LIBRE / POR_SESIONES).
 */
@Module({
  imports: [AuthModule, RolesModule, AuditModule],
  controllers: [ServicesController],
  providers: [ServicesService],
  exports: [ServicesService],
})
export class ServicesModule {}
