import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type DatabaseStatus = 'up' | 'down';

/**
 * Expone el healthcheck de la API para probes y verificación local.
 *
 * @remarks No requiere autenticación ni tenant. Incluye ping a PostgreSQL
 * vía Prisma para detectar fallas de persistencia en desarrollo.
 */
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Indica si el proceso Nest responde y si la base está alcanzable.
   *
   * @returns Estado de la API, de la DB y timestamp ISO.
   */
  @Get()
  async check(): Promise<{
    status: 'ok' | 'degraded';
    database: DatabaseStatus;
    checkedAt: string;
  }> {
    let database: DatabaseStatus = 'down';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      database = 'up';
    } catch {
      database = 'down';
    }

    return {
      status: database === 'up' ? 'ok' : 'degraded',
      database,
      checkedAt: new Date().toISOString(),
    };
  }
}
