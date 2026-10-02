# App: Crashlytics y preparación de tiendas

**Fecha:** 2026-10-01
**Roadmap:** Backlog app afiliado — Crashlytics / Preparar App Store y Play
**Commit:** `0357e4c` — feat(mobile): Crashlytics en release y preparacion de tiendas
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/0357e4c

## Resumen

La app queda lista en código para publicar: Crashlytics en release (sin romper si falta la config de Firebase), firma de release de Android con `key.properties` fuera de git e iOS preparado para compilar con Codemagic. La guía de publicación cubre el camino de cuenta personal. Quedan pasos de consola y dos bloqueantes: eliminar cuenta y librerías nativas a 16 KB.

## Cambios principales

- `CrashReporter`: solo release, usuario opaco (`identityId`, `profile_type`, `tenant_id`), crash de prueba con `CRASH_TEST`.
- Gradle: plugins de Firebase solo si existe `google-services.json`; firma desde `key.properties`; `compileSdk` 36 para `isar_flutter_libs`.
- iOS: permiso de cámara, export compliance, entitlement de Sign in with Apple, Google iOS por `GoogleSignIn.xcconfig`, copia del plist de Firebase si existe.
- Sign in with Apple solo en iOS; la API acepta `APPLE_APP_BUNDLE_IDS` como audience.
- Ajustes: "Desarrolladores" oculto en release.
- Docs: `docs/mobile/publicar-tiendas.md` y `docs/mobile/fichas-tiendas.md`.

## Decisiones

- Cuenta personal (monotributo) en Play y Apple; Play exige prueba cerrada de 12 testers por 14 días.
- Firebase en el mismo proyecto GCP de Google Sign-In; los archivos de config se commitean.
- iOS sin Mac: build en Codemagic cuando se pague Apple Developer.

## Validación

- `flutter analyze` sin issues; `tsc --noEmit` en la API.
- `flutter build apk --release` y `appbundle --release` OK sin Firebase y con un `google-services.json` falso (plugins aplicados).
- Firma con keystore descartable verificada con `apksigner` (`CN=Test`).
- Alineación de `.so`: `libisar.so` y `libsodium.so` a 4 KB (ticket aparte).

## Referencias

- [publicar-tiendas.md](../mobile/publicar-tiendas.md) · [fichas-tiendas.md](../mobile/fichas-tiendas.md) · [isar-wallet.md](../mobile/isar-wallet.md)
- Commit: `0357e4c`
