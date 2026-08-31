# GymBro

Plataforma SaaS multi-tenant para gestión de gimnasios y estudios (Argentina).

## Documentación

La definición de producto (C-producto) está en [`docs/`](./docs/00-indice.md).

Punto de entrada: [docs/00-indice.md](./docs/00-indice.md)

Roadmap del MVP: [docs/11-roadmap-mvp.md](./docs/11-roadmap-mvp.md)

Diseño acceso OID4 (Kuatia): [docs/12-acceso-quark-oid4-diseno.md](./docs/12-acceso-quark-oid4-diseno.md)  
Issuer/verifier compartidos en Kuatia: ver sección Kuatia abajo.

## Estructura

```text
api/                 # NestJS — puerto 3001 — GET /api/health
web/                 # Next.js — puerto 3000
mobile/              # Flutter (fuera de Docker)
postman/             # Colección + environment de prueba
docker-compose.yml   # postgres + redis + api + web (dev)
docker/              # pgAdmin config
ssi-quark/           # README redirect → identity_core_dart/
identity_core_dart/  # Package Flutter wallet (gitignore; clon local)
docs/
git-hooks/
```

Cada app tiene su propio manifest y su propio `.env`. **No** hay `package.json` ni `.env` en la raíz.

Requisitos: **Docker Desktop** (o Engine + Compose). Fuera de Docker: **Node.js 24 (Active LTS)** y **Flutter** si corrés apps en el host.

## Desarrollo con Docker (recomendado)

1. Env por app (Compose los lee desde cada carpeta):

```powershell
Copy-Item api\.env.example api\.env
Copy-Item web\.env.example web\.env
```

Completá en `api/.env` las claves y wallet IDs de Kuatia (`KUATIA_*`).

2. Levantá todo:

```powershell
docker compose up --build
```

Servicios:

| Servicio | URL / puerto |
|----------|----------------|
| Web | http://demo.localhost:3002 — Admin Staff (slug); http://localhost:3002/super — Super Admin |
| API health | http://localhost:3001/api/health |
| Kuatia | URLs públicas del producto (ver `KUATIA_*_BASE_URL` en `api/.env`) |
| Postman | [`postman/`](./postman/) |
| Postgres | `localhost:5433` → contenedor `5432` (user/pass/db: `gymbro`) |
| pgAdmin | http://localhost:5050 — `admin@example.com` / `gymbro` (server: host `postgres`, pass DB `gymbro`) |
| Redis | `localhost:6379` |

### Kuatia (OID4VCI + OID4VP)

Modelo: **1 producto** GymBro → **1 issuer + 1 verifier** compartidos para todos los gyms. Distinción por claims (`tenantId`, `packId`). Docs: [kuatia.xyz/docs](https://kuatia.xyz/docs).

1. Creá el producto en la consola Kuatia; copiá API keys (`iss_live_…` / `ver_live_…`) y `walletId` a `api/.env`.
2. Compose **no** levanta issuer/verifier locales.
3. Crear un gym solo persiste GymBro; **no** hay provision/bind por tenant. Wallets = env `KUATIA_*`.
4. Create/update de pack → `PATCH` metadata del issuer compartido (`pack_{id}` / `urn:gymbro:pack:{id}`; soft-fail → `packs.kuatia_*`).
5. Pack APPROVED → offer OID4VCI; puerta → OID4VP contra el verifier compartido (auth `x-api-key`).

Deuda rename/SDK: [docs/15-kuatia-deuda-rename.md](./docs/15-kuatia-deuda-rename.md).
Parar:

```powershell
docker compose down
```

Hot-reload: código de `api/` y `web/` montado como volumen. `node_modules` vive en volúmenes Docker.

Si agregás dependencias nuevas en el host, sincronizá el contenedor:

```powershell
docker compose exec api npm install
docker compose restart api
```

O regenerar volúmenes (borra también datos de Postgres/Redis **y** `node_modules` de los contenedores):

```powershell
docker compose down -v
docker compose up --build -d
```

Después de `down -v` la DB queda vacía: migraciones + generate + seed. Checklist completo: [docs/13-setup-db-desde-cero.md](./docs/13-setup-db-desde-cero.md).

```powershell
docker compose exec api npx prisma migrate deploy
docker compose exec api npx prisma generate
docker compose exec api npm run prisma:seed
docker compose restart api
```

Si el health da `socket hang up` o la API no compila tras un schema nuevo, suele faltar el `prisma generate` en el volumen del contenedor (paso de arriba).

### Base de datos (Prisma)

ORM: **Prisma 6** en `api/prisma/` (Prisma 7 queda diferido: exige ESM + driver adapters poco amigables con Nest CJS). Ver [docs/13-setup-db-desde-cero.md](./docs/13-setup-db-desde-cero.md).

```powershell
# Aplicar pendientes (DB limpia / Compose):
docker compose exec api npx prisma migrate deploy

# Crear migración nueva en dev:
docker compose exec api npm run prisma:migrate

# Seed (Super + demo):
docker compose exec api npm run prisma:seed
```

Health con DB: `GET /api/health` → `{ status, database, checkedAt }`.

### Auth (JWT + refresh)

Seed y credenciales: [docs/13-setup-db-desde-cero.md](./docs/13-setup-db-desde-cero.md) · [docs/credenciales-demo.md](./docs/credenciales-demo.md).

| Perfil | Endpoint | Seed |
|--------|----------|------|
| Super | `POST /api/auth/super/login` | `super@faciliter.xyz` / `ChangeMe123!` |
| Staff | `POST /api/auth/staff/login` (+ `tenantId`) | `admin@gymdeprueba.com` / `ChangeMe123!` |
| Afiliado | `POST /api/auth/member/login` (+ `tenantId`) | `socio@gymdeprueba.com` / `ChangeMe123!` |

Detalle (bodies, tenant id): [`docs/credenciales-demo.md`](./docs/credenciales-demo.md).

Tenant demo id: `00000000-0000-4000-8000-000000000001`. También: `POST /api/auth/refresh`, `POST /api/auth/logout`, `GET /api/auth/me` (Bearer; staff/member traen `tenantId`).

Rutas de negocio: `@RequireTenantAuth()` + `@CurrentTenant()` (tenant solo del JWT). Permisos staff: `@RequirePermission('…')` (Admin seed tiene el catálogo; Super no usa esto en rutas `/tenants/...`).

Super Admin — tenants: `POST /api/tenants` requiere `ownerEmail` / `ownerPassword` (+ `ownerName` opcional); crea branch, roles y owner con rol Admin. Roles: `GET|POST|PATCH /api/tenants/:tenantId/roles` (Super) o `GET|POST|PATCH /api/roles` (Staff, permiso `roles.write`). Asignar roles: `PUT /api/tenants/:tenantId/staff/:staffId/roles` o `PUT /api/staff/:staffId/roles` (Staff JWT). Afiliados: `GET|POST|PATCH /api/members` (Staff: `members.read` / `members.write`; status con `members.deactivate`) o Super bajo `/api/tenants/:tenantId/members`; estado de cuenta `GET /api/members/:memberId/account` y `GET /api/me/account`. Sesiones: `GET|POST|PATCH /api/sessions`, `PATCH /api/sessions/:id/capacity` (ampliar cupo, CU-SER-005) y reglas semanales `GET|POST|PATCH /api/session-recurrence-rules` (`sessions.write`), con mirrors Super bajo `/api/tenants/:tenantId/...`. Reservas con crédito: Member `POST|GET /api/me/reservations`, `PATCH /api/me/reservations/:id/status` (cancelar en ventana); Staff `POST|GET /api/members/:memberId/reservations` (crédito o `coverage=DROP_IN` con pago stub/caja y `service.dropInPrice`), `PATCH /api/reservations/:id/status` (`reservations.write`). Lista de espera: Member `POST|GET /api/me/waitlist`, `PATCH .../status`; Staff `POST|GET /api/members/:id/waitlist`, `GET /api/sessions/:id/waitlist` (`reservations.write`; promoción AUTO al cancelar/ampliar). Settings gym: `GET|PATCH /api/tenant-settings` (`tenant.settings.read/write`; `reservationCancellationHours`, `waitlistMode`, `allowLateSessionEntry`). Caja del día: `GET /api/cash-register/day` y arqueo `POST /api/cash-register/day/reconcile` (`cashier.operate`; timezone BA). Cuenta MP: `GET|PUT|DELETE /api/mercadopago/account` + `POST .../test` (`mp.connect`; token cifrado). Checkout pack: Member `POST /api/me/transaction-items/mp/checkout`; Staff `POST /api/members/:id/transaction-items/mp/checkout` (`members.write`). Drop-in MP: Member/Staff `.../drop-in-checkout` (`reservations.write` staff); webhook → reserva. Webhook `POST /api/webhooks/mercadopago` (+ `/simulate` en stub). Devoluciones: Member `POST /api/me/transaction-items/:id/refund-requests`; Staff `POST /api/transactions/:id/refunds` (lote) y `POST /api/transaction-items/:id/refunds` (`transaction_items.refund`). Acceso puerta OID4VP: Staff `POST /api/access/oid4vp/request` + `GET /api/access/oid4vp/session/:id` + `GET /api/access-attempts` (`access.verify`); pase manual `POST /api/members/:id/access/manual-pass` (`access.manual_pass`). Settings: tolerancia deuda y multi-ingreso en `GET|PATCH /api/tenant-settings`. Comprobantes: Member `GET /api/me/receipts`; Staff `GET /api/transactions/:transactionId/receipt` (`members.read`). Servicios: `GET|POST|PATCH /api/services` (Staff, `catalog.write`) o Super `/api/tenants/:tenantId/services`. Packs: `GET|POST|PATCH /api/packs` … Contrataciones: Staff `POST|GET /api/members/:memberId/contracts` (`members.write` / `members.read`, pago stub APPROVED); `PATCH /api/contracts/:contractId/status` → `CANCELLED` (pierde acceso/créditos); Member `GET /api/me/contracts`. Auditoría: `GET /api/audit-events`.

Probar con Postman: importá [`postman/`](./postman/) (colección + environment local). Los logins guardan `accessToken` / `refreshToken` vía scripts.

> Nota: Postgres del Compose se publica en el host como `localhost:5433`. Desde el host, Prisma CLI usa ese puerto; dentro de Docker la API sigue con `postgres:5432`.

Mobile en el host (device USB / ADB):

```powershell
cd mobile
flutter pub get
flutter run
```

API default del afiliado: `https://api-gymbro.pruebasaproduccunon.uno` (override con `--dart-define=API_BASE_URL=...`). Demo: slug `gym-de-prueba` / `socio@gymdeprueba.com` / `ChangeMe123!`.
## Sin Docker (apps en el host)

### API

```powershell
cd api
Copy-Item .env.example .env
# En .env usá localhost en DATABASE_URL / REDIS_URL si Postgres/Redis están en Docker
npm install
npm run prisma:migrate
npm run prisma:seed
npm run start:dev
```

### Web

```powershell
cd web
Copy-Item .env.example .env
npm install
npm run dev
```

## CI

En push y PR a `main`, GitHub Actions corre lint + build de `api/` y `web/` (Node 24). Workflow: [`.github/workflows/ci.yml`](./.github/workflows/ci.yml). Ver el check en la pestaña **Actions** del repo o en el commit/PR.

Local (mismo criterio que CI):

```powershell
cd api; npm ci; npm run lint:check; npm run build
cd ../web; npm ci; npm run lint; npm run build
```

## Flujo de trabajo para agentes

- Skills: [`.cursor/skills/`](./.cursor/skills/)
- Entrada: `@.cursor/skills/gymbro-context/SKILL.md` + la tarea
- Al cerrar: confirmación → commit/push (sin Co-authored-by Cursor) → `docs/tareas-terminadas/`

## Git hook (sin Co-authored-by de Cursor)

```powershell
Copy-Item -Force git-hooks\commit-msg .git\hooks\commit-msg
```

Detalle: [`git-hooks/README.md`](./git-hooks/README.md).
