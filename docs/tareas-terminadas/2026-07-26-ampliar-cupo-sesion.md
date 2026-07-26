# Ampliar cupo de sesión

**Fecha:** 2026-07-26  
**Roadmap:** E4 — Ampliar cupo  
**Commit:** `680ef42` — feat(api): add dedicated endpoint to expand session capacity  
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/680ef42

## Resumen

Staff amplía el cupo de una sesión publicada con `PATCH /api/sessions/:id/capacity` (solo valores mayores al actual). Audita `session.capacity.expand`. Hook de lista de espera queda no-op hasta CU-RES-005. Bajar cupo sigue permitido en el PATCH general si ≥ `bookedCount`.

## Cambios principales

- `ExpandSessionCapacityDto` + `SessionsService.expandCapacity`
- Rutas Staff y Super `PATCH .../sessions/:sessionId/capacity`
- Postman **Staff PATCH expand capacity**; docs README / arquitectura / esquema / roadmap

## Decisiones

- Endpoint dedicado vs PATCH genérico
- Canceladas no se amplían
- Lista de espera diferida (hook listo)

## Validación

- lint/build OK
- Prueba Postman sobre `/capacity` (subir OK; bajar/igual/cancelada → 400)

## Referencias

- CU-SER-005, RN-SER-010
- Commit: https://github.com/LucianoMocchegiani/gym-bro/commit/680ef42
