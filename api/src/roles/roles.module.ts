import { Module, forwardRef } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { PermissionGuard } from './guards/permission.guard';
import { MePermissionsController } from './me-permissions.controller';
import { PermissionsService } from './permissions.service';
import { RolesController } from './roles.controller';
import { RolesSeedService } from './roles-seed.service';
import { RolesService } from './roles.service';
import { SuperRolesController } from './super-roles.controller';

/**
 * Roles y permisos: catálogo global, seed, CRUD y autorización por código.
 */
@Module({
  imports: [AuthModule, forwardRef(() => AuditModule)],
  controllers: [RolesController, SuperRolesController, MePermissionsController],
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
