# CRUD tenant (Super Admin)

**Fecha:** 2026-07-19  
**Roadmap:** E1 — CRUD tenant (Super Admin)  
**Commit:** `07603e7` — feat(api): add Super Admin CRUD for tenants  
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/07603e7

## Resumen

Quedó el CRUD de tenants a nivel plataforma: crear, listar, ver y renombrar vía `/api/tenants`, protegido con `@RequireSuperAuth()`. Suspender, sucursal, roles seed y admin del gym quedan para tareas siguientes de E1.

## Cambios principales

- `SuperGuard` + `@RequireSuperAuth()`
- Módulo `api/src/tenants/` (POST/GET/PATCH)
- Postman carpeta **Tenants (Super)** + `createdTenantId`

## Decisiones

- Ruta `/api/tenants` (no `/api/super/tenants`)
- CRUD puro: sin admin al crear; sin cambio de `status`

## Validación

- Lint + build API OK
- Postman: Super create/list/get/patch; Staff → 403
- Commit y push a `main`

## Referencias

- [CU-ROL-001](../05-casos-de-uso/roles-permisos.md) (parcial)
- RN-TEN-002, RN-ROL-001
- Commit: https://github.com/LucianoMocchegiani/gym-bro/commit/07603e7
