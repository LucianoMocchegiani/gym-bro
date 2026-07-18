# TenantGuard multi-tenant + esquema DB vivo

**Fecha:** 2026-07-18  
**Roadmap:** E0 — Middleware multi-tenant (`tenant_id` vía `TenantGuard` / JWT)  
**Commit:** `a2c5c6b` — feat(api): add TenantGuard for multi-tenant request isolation  
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/a2c5c6b

## Resumen

Quedó el aislamiento multi-tenant en requests staff/member con `TenantGuard` + `X-Tenant-Id`, decorators `@RequireTenantAuth()` / `@CurrentTenant()`, y el documento vivo `docs/09-esquema-db.md` alineado a Prisma. Super Admin no exige tenant. El status del tenant no se revalida en cada request (solo login/refresh).

## Cambios principales

- Módulo `api/src/tenant/` (`TenantGuard`, decorators, `assertTenantMatch`)
- `TenantModule` global + export de `JwtAuthGuard` desde Auth
- `docs/09-esquema-db.md` + sync de arquitectura, roadmap, Postman y skills

## Decisiones

- Header `X-Tenant-Id` obligatorio para staff/member; debe coincidir con el JWT
- Sin validación de status en cada request (access ~15 min)
- Sin endpoint demo: probar con `/api/auth/me` + header

## Validación

- Build API OK
- Postman: staff/member con `X-Tenant-Id` correcto/incorrecto/ausente
- Commit y push a `main`

## Referencias

- [Roadmap MVP](../11-roadmap-mvp.md)
- [Arquitectura](../06-arquitectura.md)
- [Esquema DB](../09-esquema-db.md)
- Commit: https://github.com/LucianoMocchegiani/gym-bro/commit/a2c5c6b
