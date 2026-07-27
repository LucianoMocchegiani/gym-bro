# Postman — GymBro API

## Importar (importante)

1. **Import** → `GymBro.api.postman_collection.json` + `GymBro.local.postman_environment.json`
2. Arriba a la derecha elegí environment **GymBro Local** (si no, `{{accessToken}}` no se reemplaza).
3. Si ya habías importado antes: borrá la colección/env viejos e importá de nuevo, o Sync variables del environment.

## Credenciales seed (en el environment **GymBro Local**)

| Variable | Valor default |
|----------|----------------|
| `tenantId` | `00000000-0000-4000-8000-000000000001` |
| `superEmail` / `superPassword` | `super@gymbro.local` / `ChangeMe123!` |
| `staffEmail` / `staffPassword` | `admin@demo.gym` / `ChangeMe123!` |
| `memberEmail` / `memberPassword` | `socio@demo.gym` / `ChangeMe123!` |
| `demoPassword` | `ChangeMe123!` (alias común) |

Los logins usan `{{tenantId}}`, `{{staffEmail}}`, etc. Reimportá el environment si no los ves.

## Secuencia automática (Collection Runner)

1. Clic derecho en **Auth flow (Collection Runner)** → **Run folder**.
2. Run: Login Super → Me → Refresh → Me → Logout.
3. Los scripts guardan `accessToken`, `refreshToken`, `profileType`, `userId`, `userEmail` en **environment + collection**.

## Manual

Carpeta **Auth (manual)**: Login Super/Staff/Member → Me → Refresh → Logout.

Carpeta **Roles** / **Staff roles**: Staff necesita permisos (`roles.write` para list/get/create/patch, `staff.write` para asignar). El Admin seed los tiene; un rol sin esos códigos → 403.

Carpeta **Audit**: `GET /audit-events` (Staff, `audit.read`) o Super por tenant. Generá eventos con mutaciones de tenant/roles/staff roles.

Carpeta **Members**: Staff `members.read` / `members.write` / `members.deactivate` (status). Estado de cuenta: `GET /members/:id/account` y `GET /me/account`. Admin seed los tiene.

Carpeta **Sessions**: Staff `sessions.write`. Servicio `POR_SESIONES` + `instructorId` opcional (`userId` del Staff). Ampliar cupo: `PATCH .../sessions/:id/capacity`. Incluye reglas semanales con hora local y timezone.

Carpeta **Reservations**: Member `POST|GET /me/reservations` (crédito) + `PATCH .../status`. Staff `reservations.write` crea crédito o drop-in (`coverage=DROP_IN`) / cancela (fuera de ventana OK).

Carpeta **Waitlist**: Member/Staff join cuando sesión llena; leave; promoción AUTO al cancelar/ampliar cupo.

Carpeta **Tenant settings**: `GET|PATCH /tenant-settings` (`tenant.settings.*`). `reservationCancellationHours`, `waitlistMode`, `allowLateSessionEntry`.

Carpeta **Cash register**: `GET /cash-register/day` + `POST /cash-register/day/reconcile` (`cashier.operate`). Movimientos CASH; arqueo 1/día (declarado ≥ 0); día en timezone BA.

Carpeta **Mercado Pago**: cuenta `GET|PUT|DELETE /mercadopago/account` + test (`mp.connect`). Checkout pack Member `POST /me/payments/mp/checkout`; webhook `POST /webhooks/mercadopago` y `/simulate` si `MP_CHECKOUT_MODE=stub`.

Carpeta **Refunds**: Member `POST /me/payments/:paymentId/refund-requests` + `GET /me/refund-requests`. Staff `GET /refund-requests` + `POST /payments/:paymentId/refunds` (`payments.refund`; `motiveCode=doble_cobro` opcional).

Carpeta **Receipts**: Member `GET /me/receipts`. Staff `GET /payments/:paymentId/receipt` y `GET /members/:id/receipts` (`members.read`). Código `GB-000001`.

Carpeta **Services**: Staff `catalog.write`. Tipos `ACCESO_LIBRE` y `POR_SESIONES`; `dropInPrice` (ARS) habilita drop-in; desactivar con `active: false`.

Carpeta **Packs**: mismos permiso. Body con `components` (serviceIds de Services). `price` pesos enteros; `creditsExpireAt` opcional ISO; `kind` en respuesta.

Carpeta **Contracts**: Staff `members.write` crea contract+pago stub; `PATCH /contracts/:id/status` cancela (pierde derechos); list con `members.read`. Member: `GET /me/contracts`.

## Multi-tenant

- `GET /auth/me` → `tenantId` para staff/member (del JWT).
- Rutas de negocio futuras: `@RequireTenantAuth()` (Super → 403).
- Rutas plataforma: `@RequireSuperAuth()` — `/api/tenants` (staff/member → 403).
- Tenant suspendido: se corta en login/refresh, no en cada request.
