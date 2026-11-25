import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PlatformPlansController, TenantPlatformModulesController } from './platform-plans.controller';
import { PlatformPlansService } from './platform-plans.service';

@Module({
  imports: [AuditModule],
  controllers: [PlatformPlansController, TenantPlatformModulesController],
  providers: [PlatformPlansService],
  exports: [PlatformPlansService],
})
export class PlatformPlansModule {}
