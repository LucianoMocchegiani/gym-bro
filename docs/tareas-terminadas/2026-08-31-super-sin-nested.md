# Super delgado: sin espejos nested

**Fecha:** 2026-08-31
**Roadmap:** E1 — Panel Super Admin (tenants)
**Commit:** `76d87ec` — feat(api): recorta espejos Super nested; el gym se opera impersonando
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/76d87ec

## Resumen

Super Admin opera el gym impersonando (`POST /auth/super/impersonate`). Se eliminaron 61 rutas nested `/api/tenants/:tenantId/...` (members, roles, catálogo, caja, etc.). Quedan CRUD de tenants, `GET /tenants/:id/staff` (para elegir a quién impersonar) y provision Kuatia.

## Cambios principales

- Borrados 14 controllers Super nested; `SuperStaffController` solo lista.
- Postman sin requests Super de negocio (salvo list staff + impersonate).
- Docs: arquitectura, esquema DB, README, roadmap.

## Decisiones

- Super no opera el gym por path de tenant. Si hace falta de nuevo, hay que reponer espejos a propósito.

## Validación

- `npx tsc --noEmit` API OK.
- Prueba manual: Super login → listar staff → impersonar → Admin. Nested viejos → 404.

## Referencias

- `docs/06-arquitectura.md` §4.1 / §5 / §12; CU-ROL-001.
- Commit: `76d87ec` / https://github.com/LucianoMocchegiani/gym-bro/commit/76d87ec
