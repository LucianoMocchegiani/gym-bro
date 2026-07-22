import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { RolesModule } from '../roles/roles.module';
import { PacksController } from './packs.controller';
import { PacksService } from './packs.service';
import { SuperPacksController } from './super-packs.controller';

/**
 * Catálogo de packs (componentes + vencimiento creditsExpireAt).
 */
@Module({
  imports: [AuthModule, RolesModule, AuditModule],
  controllers: [PacksController, SuperPacksController],
  providers: [PacksService],
  exports: [PacksService],
})
export class PacksModule {}
