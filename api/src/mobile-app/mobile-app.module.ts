import { Module } from '@nestjs/common';
import { MobileAppConfigController } from './mobile-app-config.controller';
import { MobileAppConfigService } from './mobile-app-config.service';

/** Política de versiones de la app móvil (forzar / sugerir actualización). */
@Module({
  controllers: [MobileAppConfigController],
  providers: [MobileAppConfigService],
})
export class MobileAppModule {}
