# GymBro Mobile — App afiliado

Flutter (Material 3). Estilos alineados al Admin web: tema oscuro/lima acid + claro.

## Requisitos

- Flutter 3.41+ / Dart 3.11+
- Device Android por USB con depuración ADB
- API alcanzable (tunnel o red)
- Clon local `identity_core_dart/` en la raíz del monorepo (wallet; ver `docs/15-kuatia-deuda-rename.md`)
- Issuer/verifier: Kuatia (`KUATIA_*` en API); no hace falta issuer local
## API

Default:

```text
https://api.faciliter.xyz
```

Override:

```powershell
flutter run --dart-define=API_BASE_URL=https://api.faciliter.xyz
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
| Email | `socio@gymdeprueba.com` |
| Password | `ChangeMe123!` |

## Slice actual

- Login afiliado (`tenantSlug`)
- **3 hubs:** Inicio · Acceso · Ajustes
  - **Inicio:** estado breve + atajos Sesiones / Tienda
    - **Sesiones:** calendario (el día abre las clases) + Mis clases (misma card). Carrito + ⋮ Historial.
    - **Tienda:** catálogo Packs | Sesiones (card única + fotos) + carrito MP. Menú ⋮ Historial (comprobante por transacción).
  - **Acceso:** Escanear (default, cámara) · Credenciales (pendientes de aceptación máx. ½ pantalla + VCs wallet)
  - **Ajustes:** cuenta, reiniciar wallet SSI, tema, API, logout (con confirmación)
- Cards SSI estilo quark-wallet + detalle expandible (look GymBro); eliminar VC una a una con confirmación
- Diálogo de confirmación reutilizable (`showConfirmDialog`) para logout / borrar VC / reiniciar wallet
- Diálogo de carga (`runWithLoadingDialog`) mientras terminan esas acciones y al aceptar offers
- Sin stub / `stub-venue` en la app

Issuer público: `https://issuer.kuatia.xyz`.

Pendiente: Historial fino (comprobante + listado solicitudes), rutinas, avisos.
