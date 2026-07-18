import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';

/**
 * Módulo raíz del monolito modular GymBro.
 *
 * @remarks En el scaffold solo importa infraestructura mínima (`HealthModule`).
 * Los bounded contexts de negocio se suman en épicas posteriores.
 */
@Module({
  imports: [HealthModule],
})
export class AppModule {}
