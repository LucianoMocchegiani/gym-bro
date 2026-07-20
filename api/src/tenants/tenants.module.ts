import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RolesModule } from '../roles/roles.module';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';

/**
 * Módulo de CRUD de tenants (Super Admin / plataforma).
 */
@Module({
  imports: [AuthModule, RolesModule],
  controllers: [TenantsController],
  providers: [TenantsService],
  exports: [TenantsService],
})
export class TenantsModule {}
