import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequireIdentityAuth } from '../auth/decorators/require-identity-auth.decorator';
import { CreatePlatformSignupDto } from './dto/create-platform-signup.dto';
import {
  IdentityGymRow,
  PlatformSignupService,
  PlatformSignupView,
} from './platform-signup.service';
import { GymPlanView } from './tenants.types';

/**
 * Puerta Identity en el apex: gyms propios, plan y checkout self-serve.
 */
@Controller('identity')
@RequireIdentityAuth()
export class IdentityPlatformController {
  constructor(private readonly signups: PlatformSignupService) {}

  @Get('tenants')
  listGyms(@CurrentUser() user: AuthUser): Promise<IdentityGymRow[]> {
    return this.signups.listOwnedGyms(user.userId);
  }

  @Get('tenants/:tenantId/plan')
  getPlan(
    @CurrentUser() user: AuthUser,
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
  ): Promise<GymPlanView> {
    return this.signups.getOwnedGymPlan(user.userId, tenantId);
  }

  @Post('signups')
  start(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreatePlatformSignupDto,
  ): Promise<PlatformSignupView> {
    return this.signups.startCheckout(user.userId, dto);
  }

  @Get('signups/:id')
  getSignup(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PlatformSignupView> {
    return this.signups.getMine(user.userId, id);
  }
}
