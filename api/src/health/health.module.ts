import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';

/**
 * Módulo de infraestructura mínima: disponibilidad de la API y de la DB.
 *
 * @remarks Usa {@link PrismaModule} global; no lo reimporta aquí.
 */
@Module({
  controllers: [HealthController],
})
export class HealthModule {}
