# Packs: creditsExpireAt + sync Kuatia

**Fecha:** 2026-08-14  
**Roadmap:** E10 — Packs creditsExpireAt + Kuatia  
**Commit:** `b3b8d7f` — feat(web): creditsExpireAt y sync Kuatia en packs  
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/b3b8d7f

## Resumen

En catálogo de packs: vencimiento de créditos solo para packs **Único**; mensuales siguen la vigencia del contrato. Ficha muestra sync Kuatia solo lectura.

## Cambios principales

- Campo fecha en nuevo/editar si `ONE_TIME`; mensual limpia `creditsExpireAt`
- Panel Sync Kuatia en `/packs/[id]`
- Roadmap E10 actualizado

## Decisiones

- Sin columna en listado ni botón re-sync
- Copy alineado a RN-SER-007 / RN-CON-002–003

## Validación

- `tsc` web OK; prueba manual Admin

## Referencias

- CU-SER-002, RN-SER-007, RN-CON-002/003
- Commit: `b3b8d7f` / https://github.com/LucianoMocchegiani/gym-bro/commit/b3b8d7f
