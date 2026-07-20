import { Module } from '@nestjs/common';
import { RolesSeedService } from './roles-seed.service';

/**
 * Semilla de roles/permisos (catálogo global + roles sistema por tenant).
 */
@Module({
  providers: [RolesSeedService],
  exports: [RolesSeedService],
})
export class RolesModule {}
