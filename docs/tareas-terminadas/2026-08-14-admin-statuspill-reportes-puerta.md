# StatusPill + AdminList en reportes, devoluciones y puerta

**Fecha:** 2026-08-14
**Roadmap:** UX Admin — listados / StatusPill
**Commit:** `346319e` — feat(web): StatusPill y AdminList en reportes, devoluciones y puerta
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/346319e

## Resumen

Se agregó `StatusPill` reutilizable, se migraron reportes, devoluciones e historial de puerta a `AdminList` (con paginación real en puerta/devoluciones), y se corrigió el wrap responsive de la toolbar.

## Cambios principales

- `StatusPill` + helpers de tono/etiqueta
- Reportes: KPIs → toolbar → grilla
- Devoluciones: toolbar + `DataTable` paginado
- Puerta: historial con toolbar + pager
- Toolbar flex-wrap sin overflow

## Validación

- `npx tsc --noEmit` en `web` OK
- Revisión manual de orden en reportes y responsive de toolbar

## Referencias

- `web/components/StatusPill.tsx`, `web/components/AdminList.tsx`
- Commit: `346319e` / https://github.com/LucianoMocchegiani/gym-bro/commit/346319e
