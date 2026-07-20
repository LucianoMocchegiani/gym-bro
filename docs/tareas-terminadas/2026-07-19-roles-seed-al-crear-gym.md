# Roles seed al crear gym

**Fecha:** 2026-07-19  
**Roadmap:** E1 — Roles seed al crear gym  
**Commit:** `90a8742` — feat(api): seed Admin and Profesor roles on tenant create  
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/90a8742

## Resumen

Quedó el catálogo global de `permissions` y roles sistema **Admin** / **Profesor** por tenant al `POST /api/tenants` (misma transacción que la sucursal default). La respuesta incluye `systemRoles` con `permissionCodes`. Sin asignación a staff ni guards por permiso.

## Cambios principales

- Prisma: `Permission`, `Role`, `RolePermission` + migración `20260719210000_roles_permissions`
- `permission-catalog.ts` + `RolesSeedService`
- Docs: `09-esquema-db`, checklist post-`down -v` en README

## Decisiones

- Permisos por código de acción (no por ruta HTTP)
- Catálogo global; roles por tenant
- Seed: Admin (todo) + Profesor (4 códigos); afiliado no es rol staff

## Validación

- migrate deploy + generate en contenedor
- Lint/build API OK
- Commit y push a `main`

## Referencias

- RN-ROL-002 / RN-ROL-003 / RN-ROL-009, CU-ROL-001
- [Esquema DB](../09-esquema-db.md)
- Commit: https://github.com/LucianoMocchegiani/gym-bro/commit/90a8742
