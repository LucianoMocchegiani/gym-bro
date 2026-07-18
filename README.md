# GymBro

Plataforma SaaS multi-tenant para gestión de gimnasios y estudios (Argentina).

## Documentación

La definición de producto (C-producto) está en [`docs/`](./docs/00-indice.md).

Punto de entrada: [docs/00-indice.md](./docs/00-indice.md)

Roadmap del MVP: [docs/11-roadmap-mvp.md](./docs/11-roadmap-mvp.md)

## Monorepo

```text
api/        # NestJS — puerto 3001 — GET /api/health
web/        # Next.js — puerto 3000
mobile/     # Flutter (fuera de npm workspaces)
docs/
git-hooks/
```

Requisitos: **Node >= 20**, **npm**, **Flutter** (para mobile).

### Instalar (JS) — lo corrés vos

Desde la raíz (workspaces: `api` + `web`):

```powershell
npm install
```

### API

```powershell
npm run dev:api
# GET http://localhost:3001/api/health
```

### Web

```powershell
npm run dev:web
# http://localhost:3000
```

### Mobile

```powershell
cd mobile
flutter pub get
flutter run
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
