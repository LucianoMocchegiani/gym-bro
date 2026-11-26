import {
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Post,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../roles/decorators/require-permission.decorator';
import { AllowWhenLimited } from '../tenant/decorators/allow-when-limited.decorator';
import { CurrentTenant } from '../tenant/decorators/current-tenant.decorator';
import { RequireTenantAuth } from '../tenant/decorators/require-tenant-auth.decorator';
import { IdentityPlanCancellationService } from './identity-plan-cancellation.service';

@Controller('plan/actions')
@RequireTenantAuth()
@AllowWhenLimited()
export class TenantPlanActionsController {
  constructor(private readonly plans: IdentityPlanCancellationService) {}

  @Get()
  get(@CurrentTenant() tenantId: string, @CurrentUser() user: AuthUser) {
    if (user.profileType !== 'STAFF') {
      throw new ForbiddenException('Staff profile required');
    }
    return this.plans.getForTenant(tenantId);
  }

  @Delete('automatic-debit')
  @RequirePermission('tenant.plan.debit.cancel')
  cancelAutomaticDebit(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
  ) {
    this.requireNotImpersonating(user);
    return this.plans.cancelAutomaticDebitForStaff(user.userId, tenantId);
  }

  @Post('finalize')
  @RequirePermission('tenant.plan.finalize')
  finalizePlan(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
  ) {
    this.requireNotImpersonating(user);
    return this.plans.finalizePlanForStaff(user.userId, tenantId);
  }

  private requireNotImpersonating(user: AuthUser): void {
    if (user.impersonatedBy) {
      throw new ForbiddenException(
        'Billing actions are disabled while impersonating',
      );
    }
  }
}
