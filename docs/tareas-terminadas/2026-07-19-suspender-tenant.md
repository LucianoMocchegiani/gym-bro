# Suspender / reactivar tenant (Super Admin)

**Fecha:** 2026-07-19  
**Roadmap:** E1 — Suspender tenant  
**Commit:** `d6c33a1` — feat(api): allow Super Admin to suspend and reactivate tenants  
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/d6c33a1

## Resumen

`PATCH /api/tenants/:id` acepta `status` `SUSPENDED` | `ACTIVE` (idempotente) y/o `name`. Staff/Member de un tenant suspendido siguen cortados en login/refresh.

## Cambios principales

- `UpdateTenantDto` con `name`/`status` opcionales
- Postman: PATCH suspend + PATCH activate
- Roadmap / README / arquitectura sync

## Decisiones

- Un solo PATCH (no endpoints `/suspend` y `/activate`)
- Idempotente → 200; body vacío → 400

## Validación

- Lint + build API OK
- Postman suspend/activate + login staff bloqueado/reactivado
- Commit y push a `main`

## Referencias

- [CU-ROL-002](../05-casos-de-uso/roles-permisos.md)
- RN-TEN-002
- Commit: https://github.com/LucianoMocchegiani/gym-bro/commit/d6c33a1
