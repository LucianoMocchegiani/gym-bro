# N1: plantillas Admin y pulido de Avisos

**Fecha:** 2026-09-30
**Roadmap:** E8 — CU-NOT-002 + UI app
**Commit:** `3b493f4` — feat(notifications): plantillas Admin y pulido de Avisos en la app
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/3b493f435d98a1c882960bd325c19aaa8969d452

## Resumen

El gym edita asunto/cuerpo y activa o apaga cada evento cableado en Admin **Avisos**. El socio ve la bandeja agrupada (nuevos / anteriores), un vacío explicado y el conteo de no leídos en Inicio.

## Cambios principales

- `GET|PATCH /notification-templates` (`tenant.settings.*`)
- Página `/avisos` + nav MCP
- Flutter: secciones, vacío, badge en Inicio

## Validación

- `nest build`; `dart analyze` de Avisos e Inicio; eslint de Admin
- Recorrido en browser/app a cargo del usuario

## Referencias

- RN-NOT-003 · RN-NOT-007 · CU-NOT-002 · N2/N4 en `docs/08-casos-prueba-manuales.md`
- Commit: `3b493f4` / https://github.com/LucianoMocchegiani/gym-bro/commit/3b493f435d98a1c882960bd325c19aaa8969d452
