import { Controller, Get } from '@nestjs/common';

/**
 * Expone el healthcheck de la API para probes y verificación local del scaffold.
 *
 * @remarks No requiere autenticación ni tenant. Es el único endpoint operativo
 * hasta que existan módulos de dominio.
 */
@Controller('health')
export class HealthController {
  /**
   * Indica que el proceso Nest está levantado y respondiendo.
   *
   * @returns Estado simple `ok` y timestamp ISO.
   */
  @Get()
  check(): { status: 'ok'; checkedAt: string } {
    return {
      status: 'ok',
      checkedAt: new Date().toISOString(),
    };
  }
}
