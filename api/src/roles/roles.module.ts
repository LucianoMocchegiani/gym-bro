import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PermissionGuard } from './guards/permission.guard';
import { PermissionsService } from './permissions.service';
import { RolesController } from './roles.controller';
import { RolesSeedService } from './roles-seed.service';
import { RolesService } from './roles.service';
import { SuperRolesController } from './super-roles.controller';

/**
 * Roles y permisos: catálogo global, seed, CRUD y autorización por código.
 */
@Module({
  imports: [AuthModule],
  controllers: [RolesController, SuperRolesController],
  providers: [
    RolesSeedService,
    RolesService,
    PermissionsService,
    PermissionGuard,
  ],
  exports: [
    RolesSeedService,
    RolesService,
    PermissionsService,
    PermissionGuard,
  ],
})
export class RolesModule {}
