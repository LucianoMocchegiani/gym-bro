# Prisma Tenant + upgrade a Node 24 LTS

**Fecha:** 2026-07-18  
**Roadmap:** E0 — PostgreSQL + ORM  
**Commit:** `eb5221f` — feat(api): add Prisma Tenant model and upgrade Node 24 stack  
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/eb5221f

## Resumen

Quedó Prisma 6 en la API con modelo mínimo `Tenant` (uuid, ACTIVE/SUSPENDED), migración inicial, `PrismaModule`/`PrismaService` y health con ping a Postgres. El runtime/Docker pasó a Node 24 Active LTS; Nest 11.1, Next 16 y React 19.2. Prisma 7 quedó diferido (ESM vs Nest CJS).

## Cambios principales

- `api/prisma/` schema + migración `init_tenant`
- Nest Prisma global + `GET /api/health` con `database`
- Docker `node:24-alpine`, `.nvmrc`, engines `>=24`
- Next 16 / React 19.2 / TypeScript 5.9
- README, arquitectura y roadmap actualizados

## Decisiones

- ORM: Prisma 6 (no Drizzle; no Prisma 7 aún)
- Schema inicial: solo `Tenant`
- IDs uuid; nombres en inglés
- Migraciones manuales en dev
- Postgres 16 sin bump (evitar romper volume local)

## Validación

- Migración aplicada en Postgres de Compose
- `npm run build` (api) + e2e health OK
- `npm run build` (web / Next 16) OK
- Commit sin trailer Co-authored-by Cursor

## Referencias

- [Roadmap MVP](../11-roadmap-mvp.md)
- [Arquitectura](../06-arquitectura.md)
- Commit: https://github.com/LucianoMocchegiani/gym-bro/commit/eb5221f
