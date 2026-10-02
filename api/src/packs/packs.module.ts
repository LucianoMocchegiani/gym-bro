import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { AccessProvidersModule } from '../access-providers/access-providers.module';
import { RolesModule } from '../roles/roles.module';
import { UploadModule } from '../upload/upload.module';
import { PacksController } from './packs.controller';
import { PublicPlatformController } from './public-platform.controller';
import { PacksService } from './packs.service';
/**
 * Catálogo de packs (componentes + sync Quark OID4VCI).
 */
@Module({
  imports: [
    AuthModule,
    RolesModule,
    AuditModule,
    AccessProvidersModule,
    UploadModule,
  ],
  controllers: [PacksController, PublicPlatformController],
  providers: [PacksService],
  exports: [PacksService],
})
export class PacksModule {}
