import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RolesController } from './roles.controller';
import { RolesSeedService } from './roles-seed.service';
import { RolesService } from './roles.service';
import { SuperRolesController } from './super-roles.controller';

/**
 * Roles y permisos: catálogo global, seed sistema y CRUD custom.
 */
@Module({
  imports: [AuthModule],
  controllers: [RolesController, SuperRolesController],
  providers: [RolesSeedService, RolesService],
  exports: [RolesSeedService, RolesService],
})
export class RolesModule {}
