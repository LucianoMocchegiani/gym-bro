# Puerta: tabs en header fijo (PageTabs reutilizable)

**Fecha:** 2026-08-18
**Roadmap:** Post-roadmap (detalle-cambios-puerta — tarea #2 del orden de trabajo)
**Commit:** `c9eefd8` — feat(web): puerta tabs en header fijo con PageTabs reutilizable
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/c9eefd8

## Resumen

Las tabs de `/puerta` (Verificar / Pase / Historial) salieron de la fila del título (`actions`) y ahora viven en una barra propia debajo del título, con altura fija y alineada arriba (`flex-start`). Al cambiar de tab el header ya no salta ni se deforma por el contenido variable. Se extrajo `PageTabs`, componente genérico reutilizable por Caja (tarea #9).

## Cambios principales

- Nuevo `web/components/PageTabs.tsx` (nav + links con `active`, altura fija).
- `DoorShell` renderiza la barra de tabs como hijo propio de `AdminShell` (ya no como `actions`).
- CSS: `.page-tabs` con `height: 2.35rem`, `flex: none`, `align-self: flex-start`, `nowrap`; `.app-content` con `align-items: start`.

## Decisiones

- Header de tabs **separado y con tamaño fijo** (no fix `flex-start` solo, que no alcanzaba).
- `PageTabs` genérico para que Caja reutilice en su tarea.

## Validación

- `npm run lint`: sin errores nuevos (11 pre-existentes).
- `npm run build` OK.
- Prueba manual de cambio de tab sin salto de header.

## Referencias

- Tarea #2 de `local/tareas flatantes/orden-de-trabajo.md` (`detalle-cambios-puerta.md`)
- Commit: `c9eefd8` / https://github.com/LucianoMocchegiani/gym-bro/commit/c9eefd8