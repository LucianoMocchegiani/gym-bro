import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { RolesModule } from '../roles/roles.module';
import { UploadModule } from '../upload/upload.module';
import { TenantSiteController } from './tenant-site.controller';
import { TenantSiteService } from './tenant-site.service';

/**
 * Web pública del gym editable (hero y sliders).
 */
@Module({
  imports: [AuthModule, RolesModule, AuditModule, UploadModule],
  controllers: [TenantSiteController],
  providers: [TenantSiteService],
  exports: [TenantSiteService],
})
export class TenantSiteModule {}
