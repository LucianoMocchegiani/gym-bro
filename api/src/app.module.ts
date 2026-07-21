import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { RolesModule } from './roles/roles.module';
import { StaffModule } from './staff/staff.module';
import { TenantModule } from './tenant/tenant.module';
import { TenantsModule } from './tenants/tenants.module';

/**
 * Módulo raíz del monolito modular GymBro.
 *
 * @remarks Infraestructura: config, Prisma, auth JWT, tenant guard y health.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    TenantModule,
    RolesModule,
    StaffModule,
    TenantsModule,
    HealthModule,
  ],
})
export class AppModule {}
