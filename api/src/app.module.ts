import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';

/**
 * Módulo raíz del monolito modular GymBro.
 *
 * @remarks Infraestructura base: config, Prisma, auth JWT y health.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    HealthModule,
  ],
})
export class AppModule {}
