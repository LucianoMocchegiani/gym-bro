import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { RolesModule } from '../roles/roles.module';
import { StaffModule } from '../staff/staff.module';
import { PlatformTrialService } from './platform-trial.service';
import { TenantsController } from './tenants.controller';
import { PublicTenantsController } from './public-tenants.controller';
import { PlanController } from './plan.controller';
import { TenantsService } from './tenants.service';

/**
 * Módulo de CRUD de tenants (Super Admin / plataforma) + resolución pública por slug.
 */
@Module({
  imports: [AuthModule, RolesModule, StaffModule, AuditModule],
  controllers: [TenantsController, PublicTenantsController, PlanController],
  providers: [TenantsService, PlatformTrialService],
  exports: [TenantsService, PlatformTrialService],
})
export class TenantsModule {}
