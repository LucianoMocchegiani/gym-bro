import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { TenantModule } from './tenant/tenant.module';

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
    HealthModule,
  ],
})
export class AppModule {}
