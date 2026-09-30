import { Module, forwardRef } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { PaymentModule } from '../payment/payment.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RolesModule } from '../roles/roles.module';
import { StaffModule } from '../staff/staff.module';
import { IdentityPlatformController } from './identity-platform.controller';
import { PlatformSignupService } from './platform-signup.service';
import { PlatformTrialService } from './platform-trial.service';
import { TenantsController } from './tenants.controller';
import { PublicTenantsController } from './public-tenants.controller';
import { PlanController } from './plan.controller';
import { TenantsService } from './tenants.service';

/**
 * Módulo de CRUD de tenants (Super Admin / plataforma) + resolución pública por slug.
 */
@Module({
  imports: [
    AuthModule,
    RolesModule,
    StaffModule,
    AuditModule,
    NotificationsModule,
    forwardRef(() => PaymentModule),
  ],
  controllers: [
    TenantsController,
    PublicTenantsController,
    PlanController,
    IdentityPlatformController,
  ],
  providers: [TenantsService, PlatformTrialService, PlatformSignupService],
  exports: [TenantsService, PlatformTrialService, PlatformSignupService],
})
export class TenantsModule {}
