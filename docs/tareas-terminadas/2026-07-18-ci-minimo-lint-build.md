# CI mínimo (lint/build) — api + web

**Fecha:** 2026-07-18  
**Roadmap:** E0 — CI mínimo (lint/build)  
**Commit:** `6d5fcaf` — ci: add GitHub Actions lint and build for api and web  
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/6d5fcaf

## Resumen

Quedó un workflow de GitHub Actions que corre lint + build de `api` y `web` (Node 24) en push y PR a `main`. La API usa `lint:check` (sin auto-fix). Se corrigió eslint de web (flat config Next 16) y detalles de lint en la API para que el pipeline nazca verde.

## Cambios principales

- `.github/workflows/ci.yml` (jobs paralelos api/web)
- Script `lint:check` en `api/package.json`
- `web/eslint.config.mjs` con config flat de Next
- README, roadmap y arquitectura actualizados

## Decisiones

- Sin Flutter, tests ni branch protection en esta tarea
- Git hooks siguen solo locales (no en CI)

## Validación

- `npm run lint:check` + `build` en api OK
- `npm run lint` + `build` en web OK
- Commit y push a `main` (verificar check en Actions)

## Referencias

- [Roadmap MVP](../11-roadmap-mvp.md)
- [Arquitectura §16](../06-arquitectura.md)
- Workflow: [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)
- Commit: https://github.com/LucianoMocchegiani/gym-bro/commit/6d5fcaf
