# Roster de sesión + reserva CREDIT staff

**Fecha:** 2026-08-13  
**Roadmap:** E10 — Sesión: roster + reservas staff  
**Commit:** `b170efb` — feat(api,web): roster de sesión y reserva CREDIT staff  
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/b170efb

## Resumen

Staff puede ver el roster de una sesión, reservar con crédito a nombre del afiliado y cancelar reservas desde `/sesiones/[id]`.

## Cambios principales

- `GET /sessions/:id/reservations` (+ Super) con `memberName` / `memberEmail`
- Cliente web + UI roster (filtro confirmadas/todas, alta CREDIT, quitar)
- Postman + roadmap E10

## Decisiones

- Drop-in sigue en Caja; waitlist en otro corte
- Cancel reserva: `window.confirm`

## Validación

- API lint/build OK; web eslint OK
- Restart API Docker

## Referencias

- CU-RES-001/003
- Commit: `b170efb` / https://github.com/LucianoMocchegiani/gym-bro/commit/b170efb
