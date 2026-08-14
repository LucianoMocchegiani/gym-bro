# Alta staff y Super tenant en AdminModal

**Fecha:** 2026-08-14
**Roadmap:** UX Admin — modales de alta
**Commit:** `1ef939a` — feat(web): alta de staff y Super tenant en AdminModal
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/1ef939a

## Resumen

Alta de staff y de tenant Super en modal desde el listado. `/staff/nuevo` y `/super/tenants/nuevo` redirigen a `?nuevo=1`. Tras crear: cierra, flash OK y refresca.

## Cambios principales

- `StaffCreateForm`, `TenantCreateForm`
- Listados + redirects

## Validación

- `npx tsc --noEmit` OK

## Referencias

- Commit: `1ef939a` / https://github.com/LucianoMocchegiani/gym-bro/commit/1ef939a
