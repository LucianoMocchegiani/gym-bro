import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PaymentModule } from '../payment/payment.module';
import { PacksModule } from '../packs/packs.module';
import { SessionsModule } from '../sessions/sessions.module';
import { MemberCatalogController } from './member-catalog.controller';

/**
 * Catálogo del afiliado: sesiones, packs y estado MP (E9 mobile).
 */
@Module({
  imports: [AuthModule, SessionsModule, PacksModule, PaymentModule],
  controllers: [MemberCatalogController],
})
export class MemberCatalogModule {}
