# GymBro

Plataforma SaaS multi-tenant para gestión de gimnasios y estudios (Argentina).

## Documentación

La definición de producto (C-producto) está en [`docs/`](./docs/00-indice.md).

Punto de entrada: [docs/00-indice.md](./docs/00-indice.md)

Roadmap del MVP: [docs/11-roadmap-mvp.md](./docs/11-roadmap-mvp.md)

## Estructura

```text
api/                 # NestJS — puerto 3001 — GET /api/health
web/                 # Next.js — puerto 3000
mobile/              # Flutter (fuera de Docker)
postman/             # Colección + environment de prueba
docker-compose.yml   # postgres + redis + api + web (dev)
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

2. Levantá todo:

```powershell
docker compose up --build
```

Servicios:

| Servicio | URL / puerto |
|----------|----------------|
| Web | http://localhost:3000 |
| API health | http://localhost:3001/api/health |
| Postman | [`postman/`](./postman/) |
| Postgres | `localhost:5432` (user/pass/db: `gymbro`) |
| Redis | `localhost:6379` |

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

Después de `down -v` la DB queda vacía: hay que **aplicar todas las migraciones** (un solo comando las corre en orden) y el seed:

```powershell
docker compose exec api npx prisma migrate deploy
docker compose exec api npx prisma generate
docker compose exec api npm run prisma:seed
docker compose restart api
```

Si el health da `socket hang up` o la API no compila tras un schema nuevo, suele faltar el `prisma generate` en el volumen del contenedor (paso de arriba).

### Base de datos (Prisma)

ORM: **Prisma 6** en `api/prisma/` (Prisma 7 queda diferido: exige ESM + driver adapters poco amigables con Nest CJS). Migraciones **manuales** en desarrollo:

```powershell
# Preferido con Compose levantado:
docker compose exec api npm run prisma:migrate

# Desde el host: en api/.env usá localhost (no el hostname `postgres`)
cd api
npm run prisma:migrate
```

Health con DB: `GET /api/health` → `{ status, database, checkedAt }`.

### Auth (JWT + refresh)

```powershell
docker compose exec api npm run prisma:seed
```

| Perfil | Endpoint | Seed |
|--------|----------|------|
| Super | `POST /api/auth/super/login` | `super@gymbro.local` / `ChangeMe123!` |
| Staff | `POST /api/auth/staff/login` (+ `tenantId`) | `admin@demo.gym` / `ChangeMe123!` |
| Afiliado | `POST /api/auth/member/login` (+ `tenantId`) | `socio@demo.gym` / `ChangeMe123!` |

Detalle (bodies, tenant id): [`docs/credenciales-demo.md`](./docs/credenciales-demo.md).

Tenant demo id: `00000000-0000-4000-8000-000000000001`. También: `POST /api/auth/refresh`, `POST /api/auth/logout`, `GET /api/auth/me` (Bearer; staff/member traen `tenantId`).

Rutas de negocio: `@RequireTenantAuth()` + `@CurrentTenant()` (tenant solo del JWT). Permisos staff: `@RequirePermission('…')` (Admin seed tiene el catálogo; Super no usa esto en rutas `/tenants/...`).

Super Admin — tenants: `POST /api/tenants` requiere `ownerEmail` / `ownerPassword` (+ `ownerName` opcional); crea branch, roles y owner con rol Admin. Roles: `GET|POST|PATCH /api/tenants/:tenantId/roles` (Super) o `GET|POST|PATCH /api/roles` (Staff, permiso `roles.write`). Asignar roles: `PUT /api/tenants/:tenantId/staff/:staffId/roles` o `PUT /api/staff/:staffId/roles` (Staff JWT). Afiliados: `GET|POST|PATCH /api/members` (Staff: `members.read` / `members.write`; status con `members.deactivate`) o Super bajo `/api/tenants/:tenantId/members`; estado de cuenta `GET /api/members/:memberId/account` y `GET /api/me/account`. Servicios: `GET|POST|PATCH /api/services` (Staff, `catalog.write`) o Super `/api/tenants/:tenantId/services`. Packs: `GET|POST|PATCH /api/packs` … Contrataciones: Staff `POST|GET /api/members/:memberId/contracts` (`members.write` / `members.read`, pago stub APPROVED); `PATCH /api/contracts/:contractId/status` → `CANCELLED` (pierde acceso/créditos); Member `GET /api/me/contracts`. Auditoría: `GET /api/audit-events`.

Probar con Postman: importá [`postman/`](./postman/) (colección + environment local). Los logins guardan `accessToken` / `refreshToken` vía scripts.

> Nota: si en el host el puerto `5432` ya lo usa otro Postgres, la CLI de Prisma fallará con error de auth; usá el `exec` del contenedor.

Mobile en el host:

```powershell
cd mobile
flutter pub get
flutter run
```

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
