import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PaymentModule } from '../payment/payment.module';
import { PacksModule } from '../packs/packs.module';
import { SessionsModule } from '../sessions/sessions.module';
import { TenantsModule } from '../tenants/tenants.module';
import { MemberCatalogController } from './member-catalog.controller';
import { PublicTenantCatalogController } from './public-tenant-catalog.controller';

/**
 * Catálogo del afiliado: sesiones, packs y estado MP (E9 mobile) + tienda
 * pública del gym.
 */
@Module({
  imports: [
    AuthModule,
    SessionsModule,
    PacksModule,
    PaymentModule,
    TenantsModule,
  ],
  controllers: [MemberCatalogController, PublicTenantCatalogController],
})
export class MemberCatalogModule {}
