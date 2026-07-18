# Scaffold monorepo en la raíz (api / web / mobile)

**Fecha:** 2026-07-18  
**Roadmap:** E0 — Scaffold monorepo + healthcheck Nest  
**Commit:** `78bb569` — chore: scaffold api, web, and mobile at repo root  
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/78bb569

## Resumen

Quedó el monorepo con NestJS (`api`), Next.js (`web`) y Flutter (`mobile`) en la raíz del repo (sin carpeta `apps/`). npm workspaces solo para `api` y `web`. Health en `GET /api/health`. Dependencias no instaladas en el commit (install a cargo del desarrollador).

## Cambios principales

- `api/` Nest + `HealthModule`
- `web/` Next App Router (sin Tailwind)
- `mobile/` Flutter placeholder
- `package.json` workspaces
- README, arquitectura y roadmap actualizados

## Decisiones

- Nombres: `api`, `web`, `mobile` en raíz
- npm workspaces (sin Turborepo)
- ORM se decide en la siguiente tarea de E0
- No correr `npm install` en el scaffold

## Validación

- Scaffold generado con `--skip-install` / `--no-pub`
- Sin `node_modules` en el commit
- Commit sin trailer Co-authored-by Cursor

## Referencias

- [Roadmap MVP](../11-roadmap-mvp.md)
- [Arquitectura](../06-arquitectura.md)
- Commit: https://github.com/LucianoMocchegiani/gym-bro/commit/78bb569
