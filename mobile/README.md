# GymBro Mobile — App afiliado

Flutter (Material 3). Estilos alineados al Admin web: tema oscuro/lima acid + claro.

## Requisitos

- Flutter 3.41+ / Dart 3.11+
- Device Android por USB con depuración ADB
- API alcanzable (tunnel o red)
- Clon local `ssi-quark/quarkid-identity-core-dart` (ver `ssi-quark/README.md`)

## API

Default:

```text
https://api-gymbro.pruebasaproduccunon.uno
```

Override:

```powershell
flutter run --dart-define=API_BASE_URL=https://api-gymbro.pruebasaproduccunon.uno
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
| Gym (slug) | `demo` |
| Email | `socio@demo.gym` |
| Password | `ChangeMe123!` |

## Slice actual

- Login afiliado (`tenantSlug`)
- **3 hubs:** Inicio · Acceso · Ajustes
  - **Inicio:** estado breve + atajos Sesiones / Tienda (placeholders)
  - **Acceso:** Escanear (default, cámara) · Credenciales (pendientes de aceptación máx. ½ pantalla + VCs wallet)
  - **Ajustes:** cuenta, tema, API, logout
- Cards SSI estilo quark-wallet + detalle expandible (look GymBro)
- Sin stub / `stub-venue` en la app

Issuer público: `https://issuer.pruebasaproduccunon.uno`.

Pendiente: calendario/reservas, packs/MP, rutinas, avisos; puerta Admin web stub hasta OID4VP gym.
