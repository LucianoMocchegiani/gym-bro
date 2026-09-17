# Drop-in ONE_TIME y cancelar serie con crédito

**Fecha:** 2026-09-17
**Roadmap:** E4 — drop-in + desactivar recurrencia
**Commit:** `d5e16aa` — feat(sessions): drop-in as ONE_TIME pack and cancel series credits
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/d5e16aa

## Resumen

La clase suelta es un pack ONE_TIME de 1 crédito (espejo del `dropInPrice`). Caja/MP crean contrato + reserva CREDIT y reusan una VC por afiliado+pack. Cancelar una clase futura o desactivar la recurrencia devuelve ese crédito.

## Cambios principales

- Pack espejo `origin_service_id`; oferta unique `(memberId, packId)`
- Cobro drop-in unificado con pack; se eliminó el camino `coverage DROP_IN` nuevo
- `cancelPublishedSession` + desactivar regla sobre sesiones `startsAt > now`

## Decisiones

- Una VC por pack, no por clase
- El pack espejo no se lista en tienda ni se edita en catálogo

## Validación

- `npx tsc --noEmit` en `api/`
- Prueba manual pendiente en VPS tras `migrate deploy`

## Referencias

- RN-SER-006, CU-SER-004, docs 09 / 12
- Commit: `d5e16aa` / https://github.com/LucianoMocchegiani/gym-bro/commit/d5e16aa
