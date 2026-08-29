# Checkout MP drop-in + Staff pack

**Fecha:** 2026-07-29  
**Roadmap:** E5 — Checkout MP (pack / drop-in)  
**Commit:** `4e6080f` — feat(api): add MP drop-in checkout and staff pack checkout  
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/4e6080f

## Resumen

Checkout Mercado Pago para drop-in (Member y Staff) y pack también desde Staff. La reserva drop-in se crea al webhook `APPROVED`; STUB/CASH drop-in sigue inmediato. `method=MP` en reserva directa se rechaza.

## Cambios principales

- `transaction_items.session_id` + migración
- `POST .../drop-in-checkout` (Member/Staff) y Staff `POST .../transaction-items/mp/checkout` (pack)
- Webhook: pack → contrato; drop-in → reserva
- Docs, roadmap y Postman

## Decisiones

- Sin hold de cupo hasta `APPROVED`
- Staff drop-in inmediato: solo STUB/CASH; MP vía checkout

## Validación

- Smoke local: reject MP directo; drop-in checkout → simulate → `reservationId`; Staff pack checkout
- Postman: pack Staff + drop-in Staff + simulate (verificado por el usuario)

## Referencias

- CU-PAG-001/006 · `docs/09-esquema-db.md` · `docs/11-roadmap-mvp.md`
- Commit: `4e6080f` / https://github.com/LucianoMocchegiani/gym-bro/commit/4e6080f
