import {
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequireIdentityAuth } from '../auth/decorators/require-identity-auth.decorator';
import { IdentityPlanCancellationService } from './identity-plan-cancellation.service';

@Controller('identity/tenants/:tenantId/plan-actions')
@RequireIdentityAuth()
export class IdentityPlanCancellationController {
  constructor(private readonly plans: IdentityPlanCancellationService) {}

  @Get()
  get(
    @CurrentUser() user: AuthUser,
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
  ) {
    return this.plans.get(user.userId, tenantId);
  }

  @Delete('automatic-debit')
  cancelAutomaticDebit(
    @CurrentUser() user: AuthUser,
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
  ) {
    return this.plans.cancelAutomaticDebit(user.userId, tenantId);
  }

  @Post('finalize')
  finalizePlan(
    @CurrentUser() user: AuthUser,
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
  ) {
    return this.plans.finalizePlan(user.userId, tenantId);
  }
}
