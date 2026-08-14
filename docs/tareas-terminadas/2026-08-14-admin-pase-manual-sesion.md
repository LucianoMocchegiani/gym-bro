# Pase manual: selector de sesión opcional

**Fecha:** 2026-08-14
**Roadmap:** E10 — Pase manual `sessionId` opcional
**Commit:** `a9e41fd` — feat(web,api): selector de sesión opcional en pase manual
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/a9e41fd

## Resumen

En `/puerta/pase-manual` el staff puede asociar el ingreso a una sesión del afiliado (default: sin sesión). El select lista reservas `CONFIRMED` de clases que aún no terminaron (`GET .../account`); si se envía `sessionId`, la API marca presente.

## Cambios principales

- UI pase manual: selector de sesión + hints si no hay reservas
- Cuenta afiliado: reservas con `endsAt >= now` (incluye clase en curso)
- CU-ACC-004, pruebas X3b/X3c, roadmap E10

## Decisiones

- No listar el calendario del gym: solo reservas del afiliado (API exige CONFIRMED)
- Default Sin sesión

## Validación

- `npx tsc --noEmit` en `web`
- Flujo manual: sin sesión / con reserva próxima

## Referencias

- CU-ACC-004 · RN-ACC-006
- Commit: `a9e41fd` / https://github.com/LucianoMocchegiani/gym-bro/commit/a9e41fd
