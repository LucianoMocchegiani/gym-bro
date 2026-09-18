# Grillas Admin contenidas en viewport angosto

**Fecha:** 2026-09-18
**Roadmap:** panel Admin / layout
**Commit:** `f825210` — fix(web): contain admin tables and calendar on narrow viewports
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/f825210

## Resumen

Las tablas Admin ya no estiran la página en móvil: scrollean dentro del panel. Los KPIs de Cierre/Reportes pasan a una columna bajo 560px. El calendario de Sesiones mantiene días usables con scroll horizontal.

## Cambios principales

- Shell: `min-width: 0` en contenido y paneles
- `DataTable`: wrapper `.table-scroll`
- Calendario: `.cal-week-scroll` + `minmax` de columna

## Decisiones

- Tabla + scroll, no cards por fila

## Validación

- Casos W1–W3 en `docs/08-casos-prueba-manuales.md` (prueba en VPS)

## Referencias

- Commit: `f825210` / https://github.com/LucianoMocchegiani/gym-bro/commit/f825210
