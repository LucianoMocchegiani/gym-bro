# Flags peligrosos + listar / detalle de roles

**Fecha:** 2026-07-21  
**Roadmap:** E1 — Flags peligrosos; Crear / listar / editar roles custom  
**Commit:** `cd768f4` — feat(api): enforce permission flags and list tenant roles  
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/cd768f4

## Resumen

Quedó la autorización fina staff con `@RequirePermission` / `PermissionGuard` (unión de roles; permisos `dangerous` = flags RN-ROL-007). Super bypass en rutas Super. Además `GET` list y detalle de roles para Staff (`/api/roles`) y Super (`/api/tenants/:tenantId/roles`) para armar la UI de edición.

## Cambios principales

- `PermissionsService` + `RequirePermission` + `PermissionGuard`
- Cableado Staff: `roles.write`, `staff.read` / `staff.write`
- `GET` list/detail roles (Super y Staff)
- Postman, README, arquitectura y roadmap

## Decisiones

- Flag peligroso = permiso del catálogo con `dangerous: true` asignado al rol (sin tabla extra)
- Lectura de roles en MVP reutiliza `roles.write` (sin `roles.read` aún)

## Validación

- Lint/build API
- Manual: Staff `GET /api/roles` con Admin demo → 200 (Admin, Profesor, customs)
- Push a `main`

## Referencias

- RN-ROL-007, CU-ROL-003 / CU-ROL-006
- Commit: https://github.com/LucianoMocchegiani/gym-bro/commit/cd768f4
