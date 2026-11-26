import { Module, forwardRef } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { ContractsModule } from '../contracts/contracts.module';
import { PaymentModule } from '../payment/payment.module';
import { PaymentRegisterModule } from '../payment-register/payment-register.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ReceiptsModule } from '../receipts/receipts.module';
import { RolesModule } from '../roles/roles.module';
import { StaffModule } from '../staff/staff.module';
import { IdentityPlatformController } from './identity-platform.controller';
import { IdentityPlanCancellationController } from './identity-plan-cancellation.controller';
import { IdentityPlanCancellationService } from './identity-plan-cancellation.service';
import { TenantPlanActionsController } from './tenant-plan-actions.controller';
import { PlatformSignupService } from './platform-signup.service';
import { PlatformTrialService } from './platform-trial.service';
import { TenantsController } from './tenants.controller';
import { PublicTenantsController } from './public-tenants.controller';
import { PlanController } from './plan.controller';
import { TenantsService } from './tenants.service';

@Module({
  imports: [
    AuthModule,
    RolesModule,
    StaffModule,
    AuditModule,
    ContractsModule,
    NotificationsModule,
    PaymentRegisterModule,
    ReceiptsModule,
    forwardRef(() => PaymentModule),
  ],
  controllers: [
    TenantsController,
    PublicTenantsController,
    PlanController,
    IdentityPlatformController,
    IdentityPlanCancellationController,
    TenantPlanActionsController,
  ],
  providers: [
    TenantsService,
    PlatformTrialService,
    PlatformSignupService,
    IdentityPlanCancellationService,
  ],
  exports: [TenantsService, PlatformTrialService, PlatformSignupService],
})
export class TenantsModule {}
