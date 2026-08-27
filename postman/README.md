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

## Listados paginados

Todos los `GET` que devuelven colecciones (Tenants, Roles, Staff, Audit, Members, Services, Packs, Contracts, Sessions, Reservations, Waitlist, Receipts, Refunds, Credential offers, Access attempts) responden:

```json
{ "items": [...], "page": 1, "pageSize": 20, "total": 0, "hasMore": false }
```

Query params comunes (ya incluidos en cada request, algunos deshabilitados por default):

| Param | Default | Notas |
|-------|---------|-------|
| `page` | `1` | 1-based |
| `pageSize` | `20` | máx. `100` |
| `q` | — | búsqueda de texto libre; no todos los recursos la soportan (ver `orderBy`/`q` deshabilitados en cada request cuando no aplica) |
| `orderBy` | — | whitelist por recurso (ver DTOs en `api/src/**/dto`) |
| `order` | `desc` | `asc`\|`desc`; **Sessions, Reservations y Waitlist** default `asc` |

Los filtros de dominio existentes (`status`, `active`, `type`, `from`, `to`, `memberId`, `result`, etc.) se mantienen sin cambios. Se quitó `limit` de `audit-events` y `access-attempts`: usá `pageSize`.

La carpeta **Auth Runner** (flow automatizado) ya fue retirada de la colección; el flujo manual (`Auth (manual)`) es el soportado.

## Manual

Carpeta **Auth (manual)**: Login Super/Staff/Member → Me → Refresh → Logout. **Super Impersonate Staff**: `POST /auth/super/impersonate` con `{ tenantId, staffUserId }` (token temporal 4h; reg audit).

Carpeta **Roles** / **Staff roles**: Staff necesita permisos (`roles.write` para list/get/create/patch; `staff.read` list/detail; `staff.write` alta + asignar roles). Incluye `GET|POST /staff` y equivalentes Super. El Admin seed los tiene; un rol sin esos códigos → 403.

Carpeta **Audit**: `GET /audit-events` (Staff, `audit.read`) o Super por tenant. Generá eventos con mutaciones de tenant/roles/staff roles.

Carpeta **Members**: Staff `members.read` / `members.write` / `members.deactivate` (status). Estado de cuenta: `GET /members/:id/account` y `GET /me/account` (default `coverage=current`; `coverage=all` para historial completo). Admin seed los tiene.

Carpeta **Sessions**: Staff `sessions.write`. Servicio `POR_SESIONES` + `instructorId` opcional (`userId` del Staff). Ampliar cupo: `PATCH .../sessions/:id/capacity`. Incluye reglas semanales con hora local y timezone.

Carpeta **Reservations**: Member `POST|GET /me/reservations` (crédito) + `PATCH .../status`. Staff `reservations.write` crea crédito o drop-in (`coverage=DROP_IN`) / cancela (fuera de ventana OK).

Carpeta **Waitlist**: Member/Staff join cuando sesión llena; leave; promoción AUTO al cancelar/ampliar cupo.

Carpeta **Tenant settings**: `GET|PATCH /tenant-settings` (`tenant.settings.*`). `reservationCancellationHours`, `waitlistMode`, `allowLateSessionEntry`.

Carpeta **Cash register**: `GET /cash-register/day` + `POST /cash-register/day/reconcile` (`cashier.operate`). Movimientos CASH; arqueo 1/día (declarado ≥ 0); día en timezone BA.

Carpeta **Mercado Pago**: cuenta `GET|PUT|DELETE /mercadopago/account` + test (`mp.connect`). Checkout pack: Member `POST /me/payments/mp/checkout` y Staff `POST /members/:id/payments/mp/checkout`. Drop-in MP: Member/Staff `.../drop-in-checkout` (reserva al APPROVED). Cart (Caja): Staff `POST /members/:id/payments/mp/cart` con `items[]` → 1 link con el total (modelo MercadoLibre). Webhook `POST /webhooks/mercadopago` y `/simulate` si `MP_CHECKOUT_MODE=stub` (`paymentId` → `contractId`/`reservationId`; `cartId` → carrito completo).

Carpeta **Refunds**: Member `POST /me/payments/:paymentId/refund-requests` + `GET /me/refund-requests`. Staff `GET /refund-requests` + `POST /payments/:paymentId/refunds` (`payments.refund`; `motiveCode=doble_cobro` opcional).

Carpeta **Receipts**: Member `GET /me/receipts`. Staff `GET /payments/:paymentId/receipt` y `GET /members/:id/receipts` (`members.read`). Código `GB-000001`.

Carpeta **Member catalog**: Catálogo del afiliado (E9 mobile). Member `GET /me/sessions` (sesiones publicadas, default próximas), `GET /me/packs` (packs activos comprables), `GET /me/mp-status` (estado conexión MP: `{ connected: boolean }`).

Carpeta **Services**: Staff `catalog.write`. Tipos `ACCESO_LIBRE` y `POR_SESIONES`; `dropInPrice` (ARS) habilita drop-in; desactivar con `active: false`.

Carpeta **Packs**: mismos permiso. Requests **MONTHLY** y **ONE_TIME** (como Sesiones con casos). Body con `components` (serviceIds de Services). `price` pesos enteros; `kind` en respuesta.

Carpeta **Contracts**: Staff **POST contract MONTHLY** (`startsAt` opcional) y **ONE_TIME** (`startsAt`/`endsAt`); apilado RN-CON; **re-POST misma `idempotencyKey`** = re-oferta. Variables `createdMonthlyPackId` / `createdOneTimePackId`. Offers: list + accept + fail member.

Carpeta **Access OID4VP**: Staff `POST /access/oid4vp/request` (pestaña **Visualize** → QR) + `GET /access/oid4vp/session/:id` (poll → evaluate). Pase manual + `GET /access-attempts`. Stubs de vínculo retirados.

## Multi-tenant

- `GET /auth/me` → `tenantId` para staff/member (del JWT).
- Rutas de negocio futuras: `@RequireTenantAuth()` (Super → 403).
- Rutas plataforma: `@RequireSuperAuth()` — `/api/tenants` (staff/member → 403).
- Tenant suspendido: se corta en login/refresh, no en cada request.
