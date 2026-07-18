import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';

/**
 * Módulo raíz del monolito modular GymBro.
 *
 * @remarks Infraestructura base: Prisma + health. Los bounded contexts
 * de negocio se suman en épicas posteriores.
 */
@Module({
  imports: [PrismaModule, HealthModule],
})
export class AppModule {}
