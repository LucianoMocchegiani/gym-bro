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
| Postgres | `localhost:5432` (user/pass/db: `gymbro`) |
| Redis | `localhost:6379` |

Parar:

```powershell
docker compose down
```

Hot-reload: código de `api/` y `web/` montado como volumen. `node_modules` vive en volúmenes Docker.

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
npm run start:dev
```

### Web

```powershell
cd web
Copy-Item .env.example .env
npm install
npm run dev
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
