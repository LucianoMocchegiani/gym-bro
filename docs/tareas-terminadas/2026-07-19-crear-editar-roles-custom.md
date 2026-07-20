# Crear / editar roles custom

**Fecha:** 2026-07-19  
**Roadmap:** E1 — Crear / editar roles custom  
**Commit:** `df6056a` — feat(api): add create and update for tenant roles  
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/df6056a

## Resumen

Quedó create/update de roles: Super en cualquier tenant (`/api/tenants/:tenantId/roles`) y staff en el suyo (`/api/roles`). El rol sistema `admin` no se modifica; Profesor y custom sí. Filtro `roles.write` y owner al crear tenant quedan para tareas siguientes.

## Cambios principales

- `RolesService` + DTOs + controllers Super/Staff
- Postman carpeta **Roles**
- Roadmap marcado `[x]`

## Decisiones

- Dos puertas: Super (cualquier gym) y Staff (JWT tenant)
- Admin inmutable; Profesor + custom editables
- Sin list/delete en esta entrega

## Validación

- Lint/build OK; `prisma generate` si el IDE no veía `prisma.role`
- Postman Super create/patch OK
- Commit y push a `main`

## Referencias

- CU-ROL-003, RN-ROL-002
- Commit: https://github.com/LucianoMocchegiani/gym-bro/commit/df6056a
