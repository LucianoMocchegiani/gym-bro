# Devoluciones (solicitud + ejecutar + doble cobro)

**Fecha:** 2026-07-26
**Roadmap:** E5 — Solicitud / Ejecutar devolución / Reembolso doble cobro
**Commit:** `13bef74` — feat(api): add refund requests and staff refund execution
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/13bef74

## Resumen

El afiliado puede solicitar devolución según política fija RN-PAG-012. Staff con `transaction_items.refund` ejecuta reembolso total siempre (RN-PAG-011): revierte contrato/reserva, egreso CASH, refund MP o `manual_pending`. Doble cobro = mismo endpoint con `motiveCode=doble_cobro`.

## Cambios principales

- Tabla `refund_requests` + campos refund en `transaction_items`
- Caja `OUTCOME`/`REFUND`; totales income/outcome/net
- APIs Member/Staff (+ mirror Super)

## Decisiones

- Política en código (no settings aún)
- Sin comprobante de devolución ni email E9
- Solicitud rechazada si no cumple política; staff igual puede devolver

## Validación

- migrate + lint/build OK
- Postman: política rechaza créditos usados; staff refund → contrato REFUNDED

## Referencias

- CU-PAG-004/005/007, RN-PAG-011/012
- Commit: `13bef74` / https://github.com/LucianoMocchegiani/gym-bro/commit/13bef74
