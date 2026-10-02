import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { FolderModule } from '../folder/folder.module';
import { RolesModule } from '../roles/roles.module';
import { TenantSettingsModule } from '../tenant-settings/tenant-settings.module';
import { UploadModule } from '../upload/upload.module';
import { MemberImportAccessCodesService } from './member-import-access-codes.service';
import { MemberImportController } from './member-import.controller';
import { MemberImportService } from './member-import.service';

/**
 * Migración de afiliados desde otro sistema (ficha + foto + carpeta + números
 * del aparato ZKTeco).
 */
@Module({
  imports: [
    AuthModule,
    RolesModule,
    AuditModule,
    UploadModule,
    FolderModule,
    TenantSettingsModule,
  ],
  controllers: [MemberImportController],
  providers: [MemberImportService, MemberImportAccessCodesService],
})
export class MemberImportModule {}
