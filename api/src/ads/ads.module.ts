import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PlatformTenantGuard } from '../auth/guards/platform-tenant.guard';
import { AdsController } from './ads.controller';
import { AdsService } from './ads.service';

@Module({
  imports: [AuthModule],
  controllers: [AdsController],
  providers: [AdsService, PlatformTenantGuard],
})
export class AdsModule {}
