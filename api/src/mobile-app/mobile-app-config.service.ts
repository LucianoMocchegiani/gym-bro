import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  MobileAppConfig,
  MobilePlatform,
  MobilePlatformVersionPolicy,
} from './mobile-app.types';

const DEFAULT_STORE_URLS: Record<MobilePlatform, string | null> = {
  android: 'https://play.google.com/store/apps/details?id=com.faciliter.mobile',
  ios: null,
};

/**
 * Política de versiones de la app móvil, leída del entorno.
 *
 * @remarks Sin tenant ni DB: se cambia por env (`APP_MIN_BUILD_ANDROID`,
 * `APP_LATEST_BUILD_IOS`, etc.) sin publicar otra versión de la app.
 * Subir el mínimo solo con cambios de API incompatibles y cuando la versión
 * nueva ya esté aprobada en la tienda de esa plataforma.
 */
@Injectable()
export class MobileAppConfigService {
  constructor(private readonly config: ConfigService) {}

  /** Política vigente para Android e iOS. */
  get(): MobileAppConfig {
    return {
      android: this.policy('android'),
      ios: this.policy('ios'),
    };
  }

  private policy(platform: MobilePlatform): MobilePlatformVersionPolicy {
    const suffix = platform.toUpperCase();
    const minBuild = this.build(`APP_MIN_BUILD_${suffix}`);
    return {
      minBuild,
      latestBuild: Math.max(minBuild, this.build(`APP_LATEST_BUILD_${suffix}`)),
      storeUrl:
        this.config.get<string>(`APP_STORE_URL_${suffix}`)?.trim() ||
        DEFAULT_STORE_URLS[platform],
    };
  }

  private build(key: string): number {
    const value = Number.parseInt(this.config.get<string>(key) ?? '', 10);
    return Number.isFinite(value) && value > 0 ? value : 0;
  }
}
