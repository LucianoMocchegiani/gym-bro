import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { KuatiaModule } from '../kuatia/kuatia.module';
import { RolesModule } from '../roles/roles.module';
import { PacksController } from './packs.controller';
import { PacksService } from './packs.service';
/**
 * Catálogo de packs (componentes + sync Quark OID4VCI).
 */
@Module({
  imports: [AuthModule, RolesModule, AuditModule, KuatiaModule],
  controllers: [PacksController],
  providers: [PacksService],
  exports: [PacksService],
})
export class PacksModule {}
