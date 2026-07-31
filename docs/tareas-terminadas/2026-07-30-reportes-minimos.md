# Reportes mínimos + historial puerta nominado

**Fecha:** 2026-07-30  
**Roadmap:** E11 — Reportes mínimos  
**Commit:** `6023140` — feat(web,api): add minimum reports and named door history  
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/6023140

## Resumen

`/reportes` muestra ingresos del período (CASH/MP/stub) con detalle nominado y snapshot de afiliados/packs. El historial de accesos queda en `/puerta` con nombres y filtro de fechas.

## Cambios principales

- `GET /reports/summary?from&to` (`reports.read`)
- UI `/reportes` + nav + KPI “sin pack activo” en dashboard
- `access-attempts` con `from`/`to` + `memberName`/`memberEmail`
- Historial puerta nominado + filtros

## Decisiones

- Reportes = dinero (+ contexto comercial); puerta no se duplica en reportes
- “Deuda” del dashboard = proxy afiliados ACTIVE sin contrato ACTIVE

## Validación

- `/reportes` sin bloque de puerta; tabla de pagos
- `/puerta` historial con nombres y rango de fechas
- Postman folder Reports

## Referencias

- `docs/11-roadmap-mvp.md` · `docs/06-arquitectura.md` · `web/README.md`
- Commit: `6023140` / https://github.com/LucianoMocchegiani/gym-bro/commit/6023140
