/** Plataformas de la app publicada en tiendas. */
export type MobilePlatform = 'android' | 'ios';

/**
 * Política de versiones de una plataforma.
 *
 * @remarks Los builds son el `+N` del `pubspec.yaml` (`versionCode` /
 * `CFBundleVersion`). `minBuild` 0 = no bloquea a nadie.
 */
export type MobilePlatformVersionPolicy = {
  /** Debajo de este build la app bloquea y pide actualizar. */
  minBuild: number;
  /** Debajo de este build la app avisa (sin bloquear) que hay versión nueva. */
  latestBuild: number;
  /** Ficha de la tienda; null si todavía no existe. */
  storeUrl: string | null;
};

/** Respuesta de `GET /api/public/app-config`. */
export type MobileAppConfig = Record<MobilePlatform, MobilePlatformVersionPolicy>;
