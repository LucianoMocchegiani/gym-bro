# Auth JWT (super / staff / member) + colección Postman

**Fecha:** 2026-07-18  
**Roadmap:** E0 — Auth JWT + refresh (staff / afiliado / super)  
**Commit:** `3e85ff5` — feat(api): add JWT auth for super/staff/member with Postman collection  
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/3e85ff5

## Resumen

Quedó autenticación por perfil con access JWT y refresh en Postgres, seed demo (super/staff/member), filtro de errores Prisma y colección Postman con Collection Runner. Se descartó Swagger a favor de Postman.

## Cambios principales

- Modelos `SuperUser`, `StaffUser`, `Member`, `RefreshToken`
- Endpoints `/api/auth/{super|staff|member}/login`, refresh, logout, me
- Seed + `JWT_*` en `api/.env.example`
- `PrismaExceptionFilter` (P2021 → 503)
- `postman/` colección + environment con scripts de tokens

## Decisiones

- Tablas separadas por perfil (RN-ROL-005)
- Refresh en Postgres; tres rutas de login
- Postman en lugar de Swagger para flujos con scripts

## Validación

- Migración + seed en Compose
- Login / me / refresh / logout vía Postman
- Build API OK
- Commit sin trailer Co-authored-by Cursor

## Referencias

- [Roadmap MVP](../11-roadmap-mvp.md)
- [Arquitectura §5](../06-arquitectura.md)
- [postman/](../../postman/)
- Commit: https://github.com/LucianoMocchegiani/gym-bro/commit/3e85ff5
