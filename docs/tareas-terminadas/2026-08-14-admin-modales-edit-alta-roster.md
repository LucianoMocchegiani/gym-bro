# Modales editar/alta y thin roster-waitlist

**Fecha:** 2026-08-14
**Roadmap:** UX Admin — modales + sesión
**Commit:** `a3bf455` — feat(web): modales editar/alta y thin roster-waitlist
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/a3bf455

## Resumen

Edición de servicio/rol y alta de afiliado en `AdminModal` (`?editar=` / `?nuevo=1`). Rutas detalle/nuevo redirigen. Roster y waitlist de sesión usan `ListToolbar` + `DataTable` + `StatusPill`.

## Cambios principales

- `ServiceEditForm`, `RoleEditForm`, `MemberCreateForm`
- Listados servicios/roles/afiliados
- Thin en `sesiones/[id]`

## Validación

- `npx tsc --noEmit` OK

## Referencias

- Commit: `a3bf455` / https://github.com/LucianoMocchegiani/gym-bro/commit/a3bf455
