import { Controller, Get } from '@nestjs/common';
import { MobileAppConfigService } from './mobile-app-config.service';
import type { MobileAppConfig } from './mobile-app.types';

/**
 * Configuración pública que la app consulta al abrir.
 *
 * @remarks Sin auth ni tenant: la app la pide antes del login para decidir
 * si bloquea (build < `minBuild`) o avisa (build < `latestBuild`).
 */
@Controller('public/app-config')
export class MobileAppConfigController {
  constructor(private readonly appConfig: MobileAppConfigService) {}

  @Get()
  get(): MobileAppConfig {
    return this.appConfig.get();
  }
}
