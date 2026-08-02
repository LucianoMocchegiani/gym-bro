import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { QuarkModule } from '../quark/quark.module';
import { RolesModule } from '../roles/roles.module';
import { StaffModule } from '../staff/staff.module';
import { TenantsController } from './tenants.controller';
import { PublicTenantsController } from './public-tenants.controller';
import { TenantsService } from './tenants.service';

/**
 * Módulo de CRUD de tenants (Super Admin / plataforma) + resolución pública por slug.
 */
@Module({
  imports: [AuthModule, RolesModule, StaffModule, AuditModule, QuarkModule],
  controllers: [TenantsController, PublicTenantsController],
  providers: [TenantsService],
  exports: [TenantsService],
})
export class TenantsModule {}
