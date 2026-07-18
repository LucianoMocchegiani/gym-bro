import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';

/**
 * Módulo de infraestructura mínima: disponibilidad de la API.
 */
@Module({
  controllers: [HealthController],
})
export class HealthModule {}
