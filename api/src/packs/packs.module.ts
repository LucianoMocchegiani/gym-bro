import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { QuarkModule } from '../quark/quark.module';
import { RolesModule } from '../roles/roles.module';
import { PacksController } from './packs.controller';
import { PacksService } from './packs.service';
import { SuperPacksController } from './super-packs.controller';

/**
 * Catálogo de packs (componentes + sync Quark OID4VCI).
 */
@Module({
  imports: [AuthModule, RolesModule, AuditModule, QuarkModule],
  controllers: [PacksController, SuperPacksController],
  providers: [PacksService],
  exports: [PacksService],
})
export class PacksModule {}
