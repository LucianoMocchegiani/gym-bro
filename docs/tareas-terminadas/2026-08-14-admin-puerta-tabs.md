# Puerta en tabs Verificar / Pase / Historial

**Fecha:** 2026-08-14
**Roadmap:** UX Admin — Puerta
**Commit:** `4a3556c` — feat(web): Puerta en tabs Verificar, Pase e Historial
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/4a3556c

## Resumen

`/puerta` unifica Verificar (OID4VP), Pase manual e Historial en tabs. La ruta `/puerta/pase-manual` redirige a `?tab=pase`.

## Cambios principales

- `DoorShell` con 3 tabs
- `DoorManualPassPanel` extraído
- Redirect de compatibilidad

## Validación

- `npx tsc --noEmit` OK

## Referencias

- Commit: `4a3556c` / https://github.com/LucianoMocchegiani/gym-bro/commit/4a3556c
