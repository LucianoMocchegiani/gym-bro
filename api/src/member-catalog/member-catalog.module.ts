import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PacksModule } from '../packs/packs.module';
import { SessionsModule } from '../sessions/sessions.module';
import { MemberCatalogController } from './member-catalog.controller';

/**
 * Catálogo del afiliado: sesiones publicadas y packs activos (E9 mobile).
 */
@Module({
  imports: [AuthModule, SessionsModule, PacksModule],
  controllers: [MemberCatalogController],
})
export class MemberCatalogModule {}
