import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { FolderModule } from '../folder/folder.module';
import { RolesModule } from '../roles/roles.module';
import { UploadModule } from '../upload/upload.module';
import { MemberImportController } from './member-import.controller';
import { MemberImportService } from './member-import.service';

/**
 * Migración de afiliados desde otro sistema (ficha + foto + carpeta).
 */
@Module({
  imports: [AuthModule, RolesModule, AuditModule, UploadModule, FolderModule],
  controllers: [MemberImportController],
  providers: [MemberImportService],
})
export class MemberImportModule {}
