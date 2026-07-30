# Admin web — catálogo servicios / packs / sesiones

**Fecha:** 2026-07-30  
**Roadmap:** E10 — Servicios / packs / sesiones  
**Commit:** `2a4864d` — feat(web): add catalog admin UI for services, packs and sessions  
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/2a4864d

## Resumen

Panel Admin para el catálogo comercial: listado/alta/edición de servicios y packs, y sesiones puntuales (editar, cancelar, ampliar cupo). Nav con tres ítems; cliente API ampliado (`services`, `packs`, `sessions`).

## Cambios principales

- Rutas `/servicios`, `/packs`, `/sesiones` (+ nuevo / `[id]`)
- Packs: componentes con reemplazo completo al guardar
- Sesiones: cancelación + `PATCH .../capacity`
- Roadmap E10 marcado; README web/arquitectura

## Decisiones

- Un solo slice con nav de tres ítems
- Packs UI simple (sin recurrencia semanal ni instructor)

## Validación

- `npm run lint` + `npm run build` en `web/`

## Referencias

- CU-SER-001/002/003/005 · `web/README.md` · `docs/11-roadmap-mvp.md`
- Commit: `2a4864d` / https://github.com/LucianoMocchegiani/gym-bro/commit/2a4864d
