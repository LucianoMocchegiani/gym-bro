# GymBro Mobile — App afiliado

Flutter (Material 3). Estilos alineados al Admin web: tema oscuro/lima acid + claro.

## Requisitos

- Flutter 3.41+ / Dart 3.11+
- Device Android por USB con depuración ADB
- API alcanzable (tunnel o red)

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
- Home / estado de cuenta (`GET /me/account`)
- **Bandeja OID4VCI:** offers `PENDING` + **Aceptar** → wallet + `POST …/accept` → `ACCEPTED` (salen de la bandeja). Si el issuer dice vencida/inválida → `POST …/fail` → `FAILED` (también sale; staff re-oferta).
- Bottom nav: Inicio · Sesiones (placeholder) · QR · Cuenta
- **Ingreso modo B:** pestaña «Escanear local» (cámara) → `POST /me/access/check-in`
- Credencial stub (pestaña «Mi credencial») para modo gym escanea afiliado
- Tema claro/oscuro

En la web, `/puerta` en modo «Afiliado escanea el local» muestra el QR `stub-venue:{tenantId}` y hace polling del resultado.

Issuer público (tunnel): `https://issuer.pruebasaproduccunon.uno` — Compose `BASE_URL` del quark-issuer. Ofers viejos con host Docker: la app reescribe a la URL pública. Tras cambiar `BASE_URL`, reiniciá issuer y re-ofertá (re-POST contrato misma `idempotencyKey`).

Pendiente: calendario/reservas, packs/MP, rutinas, avisos, devoluciones, OID4VP en puerta.
