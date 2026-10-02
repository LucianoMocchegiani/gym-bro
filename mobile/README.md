# Faciliter Mobile — App afiliado

Flutter (Material 3). Estilos alineados al Admin web: tema oscuro/lima acid + claro.

## Requisitos

- Flutter 3.41+ / Dart 3.11+
- Device Android por USB con depuración ADB
- API alcanzable (tunnel o red)
- `identity-core-dart/` en la raíz del monorepo (wallet; versionado; ver `docs/mobile/isar-wallet.md`)
- Issuer/verifier: Kuatia (`KUATIA_*` en API); no hace falta issuer local
## API

Default:

```text
https://api.faciliter.xyz
```

Local (USB):

```powershell
adb reverse tcp:3001 tcp:3001
fvm flutter run -d ZY22K73544 --dart-define=API_BASE_URL=http://localhost:3001
```

## Correr en tu Android (USB)

```powershell
cd mobile
flutter pub get
adb devices
flutter run
```

## Login demo

| Campo | Valor |
|-------|--------|
| Email | `socio@gymdeprueba.com` |
| Password | `ChangeMe123!` |

Google: el client Web va bakeado en la app (`GoogleAuthConfig`). Nest usa el mismo en `GOOGLE_OAUTH_CLIENT_IDS` (`api/.env`). Package Android `com.faciliter.mobile`. SHA-1 debug: `cd android; .\gradlew.bat signingReport`. Override: `--dart-define=GOOGLE_SERVER_CLIENT_ID=…`.

## Slice actual

- Login cuenta (email+password) + Continuar con Google (`GOOGLE_SERVER_CLIENT_ID`)
- **3 hubs:** Inicio · Acceso · Ajustes
  - **Inicio afiliado:** atajos Sesiones / Tienda
    - **Sesiones:** calendario (el día abre las clases) + Mis clases (misma card). Carrito + ⋮ Historial.
    - **Tienda:** catálogo Packs | Sesiones (card única + fotos) + carrito MP. Menú ⋮ Historial (comprobante + Compartir).
  - **Inicio staff:** Sesiones (roster) / Caja (`cashier.operate`)
    - **Caja:** picker, cobro CASH/MP, panel de comprobante + Compartir
  - **Acceso:** Escanear (default, cámara) · Credenciales (pendientes de aceptación máx. ½ pantalla + VCs wallet)
  - **Ajustes:** cuenta, wallet, tema, logout. Desarrolladores (API / Chat API en staff) solo en debug o con `CRASH_TEST`
- Cards SSI estilo quark-wallet + detalle expandible (look GymBro); eliminar VC una a una con confirmación
- Diálogo de confirmación reutilizable (`showConfirmDialog`) para logout / borrar VC / reiniciar wallet
- Diálogo de carga (`runWithLoadingDialog`) mientras terminan esas acciones y al aceptar offers
- Sin stub / `stub-venue` en la app

Issuer público: `https://issuer.kuatia.xyz`.

## Release y tiendas

```powershell
fvm flutter build appbundle --release --build-number=<N>
```

- Firma: `android/key.properties` (copiar de `key.properties.example`; fuera de git). Sin él, firma debug.
- Crashlytics: solo release y solo si están `android/app/google-services.json` / `ios/Runner/GoogleService-Info.plist`. Crash de prueba: `--dart-define=CRASH_TEST=true` → Ajustes → Desarrolladores.
- Sign in with Apple: solo iOS.
- Eliminar cuenta: Ajustes → Eliminar cuenta (escribir ELIMINAR) → `DELETE /api/me/identity`, borra la wallet y cierra sesión. URL web para Play: `faciliter.xyz/cuenta/eliminar`.
- Versión mínima: al abrir consulta `GET /api/public/app-config` y compara el `--build-number`. Debajo del mínimo bloquea; debajo del último sugiere una vez. Sin red sigue normal (`lib/features/app_update/`).
- Guía completa: [docs/mobile/publicar-tiendas.md](../docs/mobile/publicar-tiendas.md).
- Todos los comandos y cuándo usarlos: [docs/mobile/comandos-flutter.md](../docs/mobile/comandos-flutter.md).

Pendiente: Historial fino (comprobante + listado solicitudes), rutinas, avisos.
