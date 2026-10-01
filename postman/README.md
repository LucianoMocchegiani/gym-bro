# Postman — GymBro API

## Importar (importante)

1. **Import** → `GymBro.api.postman_collection.json` + `GymBro.local.postman_environment.json`. chat-api: `GymBro.chat-api.postman_collection.json` (incluye `POST /v1/public/session` sin JWT). mcp: `GymBro.mcp.postman_collection.json` (colecciones aparte).
2. Arriba a la derecha elegí environment **GymBro Local** (si no, `{{accessToken}}` no se reemplaza).
3. Si ya habías importado antes: borrá la colección/env viejos e importá de nuevo, o Sync variables del environment (quedaron vars nuevas de plataforma).
4. **Seed**: necesita Node 24 (el del contenedor), no el Node del host.

   ```
   docker cp api\prisma\seed.ts facilitation-api:/app/prisma/seed.ts
   docker exec facilitation-api sh -c "cd /app && npx prisma db seed"
   ```

## Credenciales seed (en el environment **GymBro Local**)

| Variable | Valor default |
|----------|----------------|
| `tenantId` | `00000000-0000-4000-8000-000000000001` |
| `staffEmail` / `staffPassword` | `admin@gymdeprueba.com` / `ChangeMe123!` |
| `memberEmail` / `memberPassword` | `socio@gymdeprueba.com` / `ChangeMe123!` |
| `googleIdToken` | `id_token` de Google (Login Google) |
| `tenantSlug` | `gym-de-prueba` (login / `GET /public/tenants/by-slug/:slug`) |
| `demoPassword` | `ChangeMe123!` (alias común) |
| `billingTenantId` | `00000000-0000-4000-8000-000000000001` (gym facturado en la Caja de plataforma) |
| `adminTenantId` | `00000000-0000-4000-8000-000000000002` (tenant `admin` / plataforma) |
| `adminEmail` / `adminPassword` | `admin@faciliter.xyz` / `ChangeMe123!` (staff del tenant `admin`) |
| `impersonateStaffUserId` | lo llena **Admin GET platform staff** (id del staff a impersonar) |

Ya no existen `superEmail` / `superPassword`: **no hay perfil `SUPER`**. La plataforma es el tenant `admin` y entra con `adminEmail` + `tenantSlug: admin`.

Los logins usan `{{tenantId}}`, `{{staffEmail}}`, etc. Reimportá el environment si no los ves.

## Listados paginados

Todos los `GET` que devuelven colecciones (Tenants, Roles, Staff, Audit, Members, Services, Packs, Contracts, Sessions, Reservations, Waitlist, Receipts, Refunds, Credential offers, Access attempts) responden:

```json
{ "items": [...], "page": 1, "pageSize": 20, "total": 0, "hasMore": false }
```

Carpeta **Folder**: etiquetas, notas/files, `GET /me/folder`. Array (no paginado). Máx. **10 ítems** por dueño; file **5 MB**; nota 20.000 caracteres. Files con GET autenticado.

Carpeta **Notifications N1**: `GET /me/notifications` (array, máx. 50); `PATCH .../read`; preferencia email (JWT Member). Staff: `GET /notification-templates` (`tenant.settings.read`); `PATCH /notification-templates/:eventCode` (`tenant.settings.write`). El envío lo disparan los eventos de negocio (pago, reserva, waitlist, devolución, cron E2/E3).

Query params comunes (ya incluidos en cada request, algunos deshabilitados por default):

| Param | Default | Notas |
|-------|---------|-------|
| `page` | `1` | 1-based |
| `pageSize` | `20` | máx. `100` |
| `q` | — | búsqueda de texto libre; no todos los recursos la soportan (ver `orderBy`/`q` deshabilitados en cada request cuando no aplica) |
| `orderBy` | — | whitelist por recurso (ver DTOs en `api/src/**/dto`) |
| `order` | `desc` | `asc`\|`desc`; **Sessions, Reservations y Waitlist** default `asc` |

Los filtros de dominio existentes (`status`, `active`, `type`, `from`, `to`, `memberId`, `result`, etc.) se mantienen sin cambios. Se quitó `limit` de `audit-events` y `access-attempts`: usá `pageSize`.

Carpeta **Health**: `GET /health`, `GET /public/platform/packs` (landing) y `GET /public/tenants/by-slug/{{tenantSlug}}` (sin auth).

## Manual

Carpeta **Auth (manual)**: Login plataforma/Staff/Member → **Identity** (`POST /auth/identity/login`) → **Google** (`POST /auth/google` + `googleIdToken`) → **From-cookie Identity** (`POST /auth/from-cookie` sin slug, cookie `central_session`) / **From-cookie Staff** (con `tenantSlug`) → memberships → select-context → Me → Refresh → Logout. **Impersonación**: `POST /auth/super/impersonate` con `{ tenantId, staffUserId }` (token temporal 4h; reg audit). El nombre de la ruta conserva el `super` histórico, pero el perfil SUPER ya no existe: el token tiene que ser el de un staff del tenant `admin`.

Carpeta **Roles** / **Staff roles**: Staff necesita permisos (`roles.write` para list/get/create/patch; `staff.read` list/detail; `staff.write` alta, `PATCH /staff/:id` ficha y asignar roles). Plataforma: `GET /tenants/:billingTenantId/staff` (para impersonar) + `POST /auth/super/impersonate`. El Admin seed los tiene; un rol sin esos códigos → 403. `GET|PATCH /roles/:id` usa `createdRoleId` del POST create (el rol `admin` no se edita).

Carpeta **Tenants (plataforma)**: CRUD completo desde el tenant `admin` (crear, editar, suspender, activar, eliminar). Es el reemplazo de la antigua carpeta `/super` del web. Requiere `PlatformTenantGuard` (el token del slug `admin`); un staff de gym normal da 403.

Carpeta **Audit**: `GET /audit-events` (Staff, `audit.read`). La plataforma ve solo los eventos de su propio tenant: para auditar un gym, impersonalo. Generá eventos con mutaciones de tenant/roles/staff roles.

Carpeta **Members**: Staff `members.read` / `members.write` / `members.deactivate` (status). Ficha `GET /members/:id`. Estado de cuenta: `GET /members/:id/account` y `GET /me/account` (default `coverage=current`; `coverage=all` para historial completo). Admin seed los tiene. La plataforma no expone este módulo (impersoná).

Carpeta **Sessions**: Staff `sessions.write`. Servicio `POR_SESIONES` + `instructorId` opcional (`userId` del Staff). Ampliar cupo: `PATCH .../sessions/:id/capacity`. Incluye reglas semanales con hora local y timezone.

Carpeta **Reservations**: Member `POST|GET /me/reservations` (crédito) + `PATCH .../status`. Staff `reservations.write` crea crédito (`POST /members/:id/reservations`) / cancela; roster `GET /sessions/:id/reservations`. Drop-in se cobra en Caja (cart).

Carpeta **Waitlist**: Member join cuando sesión llena; leave; promoción AUTO. Staff: alta a nombre del afiliado + cola de la sesión (`GET /sessions/:id/waitlist`).

Carpeta **Tenant settings**: `GET|PATCH /tenant-settings` (`tenant.settings.*`). `reservationCancellationHours`, `waitlistMode`, `allowLateSessionEntry`.

Carpeta **Expirations**: Staff `GET /expirations` (`members.read`). Query `view` (`all`\|`upcoming`\|`tolerance`) y `pay` (`all`\|`debit`\|`manual`). Cola MONTHLY por vencer o en tolerancia; no pagina.

Carpeta **Payment register**: `GET /payment-register/day` + `POST /payment-register/day/reconcile` (`cashier.operate`). `movements[]` = 1 fila por cobro o devolución de cart (misma grilla que reportes); arqueo 1/día; día en timezone BA. `cash` = `{ income, outcome, expenses, expected }` solo en efectivo; el arqueo guarda `cash.expected`. `digital` = mismo shape con MP, transferencia y tarjeta (informativo).

Carpeta **Expenses**: gastos del gym (RN-GAS). `expenses.read` (GET) / `expenses.write` (resto). Etiquetas `GET|POST /expense-labels`, `PATCH|DELETE /expense-labels/:id` (con gastos → 409, archivar). Gastos `GET|POST /expenses`, `GET /expenses/summary`, `GET|PATCH|DELETE /expenses/:id`. Comprobantes `POST /expenses/:id/files` (multipart `file`, PDF/imagen 5 MB, máx. 5), `GET|DELETE .../files/:fileId`. Gasto `CASH` en un día con arqueo cerrado → 409 al editar/borrar. Variables `expenseLabelId`, `expenseId`, `expenseFileId`.

Carpeta **Mercado Pago**: cuenta `GET|PUT|DELETE /mercadopago/account` + test (`mp.connect`) + `GET /mercadopago/account/public-key` (`cashier.operate`, Checkout Pro). Débito MONTHLY: `GET /debit-mandates`, `GET /members/:id/debit-mandate`, `POST /members/:id/debit-mandates` (`packId` + `chargeNow` → `checkoutUrl`), `PATCH` pack, `POST .../cancel`. **No** hay `POST .../charge`. Caja: Staff `POST /members/:id/transaction-items/mp/cart` (`items[]` → 1 link) y `POST .../cash/cart`. Afiliado: `POST /me/transaction-items/mp/cart`. Webhook `POST /webhooks/payment?tenantId=` (`payment`, `subscription_preapproval`, `subscription_authorized_payment`).

### Caja de plataforma (tenant `admin` → gym)

El tenant `admin` vende packs propios a otros tenants. Logueate con `adminEmail`/`adminPassword` (staff del tenant `admin` con rol `super-admin`).

| Request | Qué hace |
|---------|----------|
| `GET /tenants/platform` | Gyms paginados (sin `admin`; `status`, `q`). TenantPicker de Caja. |
| `GET /tenants/platform/kpis` | Inicio plataforma: `activeGyms` y `withoutActiveTenantContract`. |
| `GET /tenants/:id/platform-trial` | Si Caja puede tildar 30 días de prueba. |
| `GET /plan` | Plan Faciliter del gym (JWT del gym, no `admin`). |
| `POST /tenants/:billingTenantId/transaction-items/cash/cart` | Cobro en efectivo o `applyTrial` (30 días). Crea contrato TENANT. `memberId` null. |
| `POST /tenants/:billingTenantId/transaction-items/mp/cart` | Genera el link de MP para que el gym pague. `payerEmail` = staff activo más antiguo del gym. |

Reglas:

- Requiere `platform.tenants.write` + `PlatformTenantGuard` (staff del tenant `admin`).
- **Solo `PACK`**: un `DROP_IN` devuelve 400 (`Platform sales only support PACK items`). El drop-in es por sesiones de un gym.
- `{{billingTenantId}}` es el gym **pagador** y no puede ser el propio `admin` (400).
- El pack (`{{createdPackId}}`) debe pertenecer al tenant `admin` — el catálogo es tenant-scoped (`@RequireTenantAuth()`).
- La transacción se emite con `tenantId = billingTenantId` y `memberId = null`. Ese `null` es lo que marca `ContractType.TENANT` en vez de `MEMBER` (`contracts.service.ts`), así que **no hay columna `targetTenantId`**: si `memberId` es null, el pagador es el propio `tenantId`.
- CASH: `APPROVED` inmediato + comprobante, sin contrato ni reserva. MP: `PENDING` + `checkoutUrl`, y el contrato `TENANT` se emite al aprobarse el webhook.
- La versión MP exige MP conectado en el **tenant admin** (la plataforma), no en el gym.

**Prerrequisito:** el catálogo es tenant-scoped, así que el pack tiene que existir en el tenant `admin`. El seed ya lo crea:

| Recurso | Nombre | Id fijo |
|---------|--------|---------|
| Service | `Faciliter Brain` | `00000000-0000-4000-8000-000000000010` |
| Pack | `Faciliter Brain Basic` — 60000 ARS, `MONTHLY` | `00000000-0000-4000-8000-000000000011` |
| Pack | `Faciliter Brain Basic de prueba` — 100 ARS, `MONTHLY` | `00000000-0000-4000-8000-000000000016` |

Si querés tus propios valores, poné el id del pack de admin en `{{createdPackId}}` o usá el fijo en el body. El `PackComponent` también es obligatorio: sin él el cobro devuelve *"Pack has no components"*.

Carpeta **Refunds**: Member `POST /me/transaction-items/:transactionItemId/refund-requests` + `GET /me/refund-requests`. Staff `GET /refund-requests`, `POST /transactions/:transactionId/refunds` (lote) y `POST /transaction-items/:transactionItemId/refunds` (wrapper; `transaction_items.refund`; `motiveCode=doble_cobro` opcional).

Carpeta **Receipts**: Member `GET /me/receipts` y `GET /me/receipts/:id`. Staff `GET /receipts/:id` y `GET /transactions/:transactionId/receipt` (`members.read`). Código `GB-000001`. El cash cart guarda `createdReceiptId`.

Carpeta **Member imports**: migración de afiliados desde otro sistema (RN-MIG). Staff con `members.import` (peligroso) **y** `members.write`. Flujo planilla: `POST /member-imports/preview` → `POST /member-imports` (`kind: ROWS`, guarda `memberImportId`) → `POST /member-imports/:id/rows` (lotes ≤ 200, idempotente) → `POST .../finish` (auditoría `member.import`). Flujo zip: `POST /member-imports/match` (DNI o mail) → `POST /member-imports` (`kind: FILES`) → `POST .../members/:memberId/photo` o `.../folder` (multipart `file`, 5 MB) → finish. Altas nuevas con `ChangeMe123!` marcada temporal; quien ya tenía cuenta en otro gym conserva su contraseña.

Contraseña (Auth): `GET /auth/password` → `{ hasPassword, temporary }`; `POST /auth/set-password` crea contraseña a cuentas solo Google/Apple (409 si ya tiene). `POST /auth/change-password` sirve para Staff, Member e Identity, desmarca la temporal y revoca todas las sesiones de la persona. Vincular Google/Apple a una cuenta con temporal borra la temporal.

Carpeta **Member catalog**: Catálogo del afiliado (E9 mobile). Member `GET /me/sessions` (sesiones publicadas + `serviceImageUrl`), `GET /me/packs` (packs activos + `imageUrl`), `GET /me/mp-status` (`{ connected }`).

Carpeta **Services**: Staff `catalog.write`. Tipos `ACCESO_LIBRE` y `POR_SESIONES`; `dropInPrice` (ARS) habilita drop-in; desactivar con `active: false`. Soporta `imageUrl` (opcional). El catálogo es tenant-scoped: el del tenant `admin` es el **catálogo de plataforma** (el pack Brain que se vende a los gyms).

Carpeta **Packs**: mismos permiso. Requests **MONTHLY** y **ONE_TIME** (como Sesiones con casos). Body con `components` (serviceIds de Services). `price` pesos enteros; `kind` en respuesta. Soporta `imageUrl` (opcional).

Carpeta **Upload**: `POST /upload` (JWT staff + tenant). Multipart `file` + `folder` (`services`|`packs`|`members`|`staff`|`tenants`). Key `tenants/{tenantId}/{folder}/{uuid}`. Límite 5MB. R2.

Carpeta **Contracts**: Staff **POST contract MONTHLY/ONE_TIME** con `method: STUB` → 400. Alta de pack: Caja o MP. **Re-oferta:** `POST /members/:id/credential-offers` (contrato vigente hoy). Variables `createdMonthlyPackId` / `createdOneTimePackId`. Offers: list + accept + fail member. Lectura staff: `GET /members/:id/account`.

Carpeta **Access OID4VP**: Staff `POST /access/oid4vp/request` (pestaña **Visualize** → QR) + `GET /access/oid4vp/session/:id` (poll → evaluate). `GET /members/:id/access-preview` (simula ingreso **sin** historial). Pase manual + `GET /access-attempts`. Stubs de vínculo retirados.

Bandeja staff propia: `GET /me/staff-credential-offers` + accept/fail (JWT Staff; no es la de packs del socio).

## chat-api (colección aparte)

Archivo [`GymBro.chat-api.postman_collection.json`](./GymBro.chat-api.postman_collection.json). No va mezclada con Nest.

1. Importá las **dos** colecciones + el environment **GymBro Local**.
2. En **GymBro API** → Auth → Login Staff (llena `accessToken` del environment).
3. En **GymBro chat-api**: health + CRUD `/v1/conversations` (`{{chatApiUrl}}` = `http://localhost:3010`). DELETE archiva. Variable de colección `createdConversationId`. **C4:** POST `…/messages` (stream; `OPENROUTER_API_KEY` real) y GET `…/messages` (historial).

## mcp (colección aparte)

Archivo [`GymBro.mcp.postman_collection.json`](./GymBro.mcp.postman_collection.json). No va mezclada con Nest ni con chat-api.

1. Importá **GymBro MCP** + el environment **GymBro Local** (y la colección API para el login).
2. Login Staff en **GymBro API** (llena `accessToken`).
3. Health (`{{mcpUrl}}` = `http://localhost:3011`) + initialize JSON-RPC. Sin Bearer → 401.
4. Tools A–D: `cd mcp; npm run smoke` (login Admin + Entrenador si no hay `ACCESS_TOKEN`). README: [`mcp/README.md`](../mcp/README.md).

## Impersonación

La plataforma entra como **staff del tenant `admin`** (rol `super-admin`). No hay perfil `SUPER` ni ruta `/super`.

Para impersonar hace falta un `staffUserId` **del gym destino**, no el propio:

1. `GET /tenants/{{billingTenantId}}/staff` — lista el staff del gym (llena `{{impersonateStaffUserId}}`).
2. `POST /auth/super/impersonate` — cookie `impersonation_handoff` + `{ tenantSlug }`.
3. `POST /auth/from-handoff` — JWT del staff (cookie de un uso). En el web: salto a `{slug}/login?handoff=1`.

Un staff de un gym normal da 403 en estos endpoints (`PlatformTenantGuard` exige `tenant.slug === 'admin'`).

El flujo web completo pide **HTTPS** (`SameSite=None; Secure`). En `http://*.localhost` la cookie no cruza subdominios (igual que Google). `COOKIE_PARENT_DOMAIN` o `CORS_APP_DOMAIN` arma el `Domain` de la cookie.

Self-serve apex: `POST /auth/identity/register`, `POST /identity/signups` (JWT Identity), `GET /identity/tenants`.

## ⚠️ Orden de decorators en controllers (bug ya corregido)

`@RequirePermission()` hace internamente `UseGuards(PermissionGuard)`, y `UseGuards` **agrega** al array mientras que los decorators se aplican **de abajo hacia arriba**. Si en un mismo handler aparecen ambos, el orden final queda invertido y `PermissionGuard` corre **antes** de `JwtAuthGuard`, ve `request.user === undefined` y responde **401 con token válido**.

Regla: cuando declares `@UseGuards(...)` con auth guards en el mismo target, **`@RequirePermission` va arriba**:

```ts
@RequirePermission('platform.impersonate')      // arriba
@UseGuards(JwtAuthGuard, PlatformTenantGuard)   // abajo
```

Si el controller ya tiene `@RequireTenantAuth()` a nivel clase, el orden se resuelve solo (los guards de clase corren antes) y da igual. Ver `api/src/roles/decorators/require-permission.decorator.ts`.

Síntoma para detectarlo: 401 con token válido en un endpoint con `@RequirePermission` + `@UseGuards` en el mismo target.

## Multi-tenant

- `GET /auth/me` → `tenantId` para staff/member (del JWT).
- Rutas de negocio: `@RequireTenantAuth()` (sin `tenantId` → 403).
- Rutas de plataforma: `JwtAuthGuard + PlatformTenantGuard + PermissionGuard`. Exigen un staff del tenant `admin` con los códigos `platform.*`:
  - `POST /api/tenants`, `GET /api/tenants`, `GET|PATCH|DELETE /api/tenants/:id`
  - `GET /api/tenants/platform` (gyms para el `TenantPicker`)
  - `GET /api/tenants/platform/kpis` (inicio de plataforma)
  - `GET /api/tenants/:billingTenantId/staff` (elegir a quién impersonar)
  - `POST /api/tenants/:billingTenantId/transaction-items/{cash,mp}/cart` (Caja de plataforma)
  - `POST /api/auth/super/impersonate` (`platform.impersonate`)
- Operar un gym: impersonate + rutas Staff.
- Tenant suspendido: se corta en login/refresh, no en cada request.

### El host manda, no la sesión

En el web, la sesión está en `localStorage` (por origen) y el subdominio es la identidad del gym. `RequireStaff` descarta la sesión si `session.tenantSlug` no coincide con el slug del host, y `AdminShell` / `DashboardInner` / `Caja` eligen vista y navegación por **host**. Consecuencia: entrar a `admin.localhost` con un token de `gym-de-prueba` en el mismo navegador no muestra datos del gym — se limpia la sesión y se manda a `/login`.

`NEXT_PUBLIC_WEB_PORT` (default `3002`) es el puerto público del web para armar los links de tenant: el compose mapea `3002:3000`, así que usar 3000 daría URLs que no existen.
