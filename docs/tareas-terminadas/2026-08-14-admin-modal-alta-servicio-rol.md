# Alta servicio y rol en AdminModal

**Fecha:** 2026-08-14
**Roadmap:** UX Admin — modales de alta
**Commit:** `4d29944` — feat(web): alta de servicio y rol en AdminModal
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/4d29944

## Resumen

`+ Nuevo` en Servicios y Roles abre modal con formulario reutilizable. Tras crear: cierra, mensaje OK y refresca. `/servicios/nuevo` y `/roles/nuevo` redirigen a `?nuevo=1`.

## Cambios principales

- `ServiceCreateForm`, `RoleCreateForm`
- Listados con modal; redirects de compatibilidad
- `AdminModal` opción `wide`

## Validación

- `npx tsc --noEmit` OK

## Referencias

- Commit: `4d29944` / https://github.com/LucianoMocchegiani/gym-bro/commit/4d29944
