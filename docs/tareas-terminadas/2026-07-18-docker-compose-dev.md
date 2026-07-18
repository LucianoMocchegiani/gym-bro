# Docker Compose de desarrollo (api, web, Postgres, Redis)

**Fecha:** 2026-07-18  
**Roadmap:** E0 — Deploy local Docker  
**Commit:** `585a367` — chore: add Docker Compose dev stack for api, web, postgres, redis  
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/585a367

## Resumen

Quedó el stack de desarrollo con Docker Compose: Postgres, Redis, API Nest y web Next, con hot-reload. Cada app usa su propio `.env` / `.env.example`. Se eliminó el `package.json` de la raíz (sin workspaces). ORM sigue pendiente.

## Cambios principales

- `docker-compose.yml` (postgres, redis, api, web)
- `api/Dockerfile.dev`, `web/Dockerfile.dev` y `.dockerignore`
- `api/.env.example` y `web/.env.example`
- Ajuste de bind en Nest para contenedor; README, arquitectura y roadmap

## Decisiones

- Env por app (`env_file`), no `.env` en la raíz
- Compose completo (no solo infra)
- Sin scripts npm de Docker; ORM en la siguiente tarea de E0

## Validación

- Documentación de levantamiento: copiar env → `docker compose up --build`
- Commit sin trailer Co-authored-by Cursor
- Push a `main`

## Referencias

- [Roadmap MVP](../11-roadmap-mvp.md)
- [Arquitectura](../06-arquitectura.md)
- Commit: https://github.com/LucianoMocchegiani/gym-bro/commit/585a367
