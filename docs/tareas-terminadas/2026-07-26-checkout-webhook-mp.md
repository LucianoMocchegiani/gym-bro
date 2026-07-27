# Checkout MP + webhook idempotente (pack)

**Fecha:** 2026-07-26
**Roadmap:** E5 — Checkout MP + Webhook MP idempotente
**Commit:** `6ec68d2` — feat(api): add MP pack checkout and idempotent webhook
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/6ec68d2

## Resumen

El afiliado inicia checkout de pack (`Payment` PENDING + Preference). El webhook (o `/simulate` en stub) aprueba/rechaza de forma idempotente; al aprobar se crea contrato + comprobante.

## Cambios principales

- `PaymentMethod.MP` + ids/URLs Preference en `payments`
- `POST /me/payments/mp/checkout` (Member)
- `POST /webhooks/mercadopago` + `/simulate` (stub)
- `ContractsService.confirmFromApprovedPayment`

## Decisiones

- Solo pack en esta entrega (drop-in MP después)
- Stub local con `MP_CHECKOUT_MODE=stub`
- Staff no puede iniciar checkout Member (403)

## Validación

- migrate + lint/build OK
- Postman: Member checkout PENDING → simulate APPROVED → contrato; re-simulate idempotente

## Referencias

- CU-PAG-001, RN-PAG-001..005, RN-PAG-009
- Commit: `6ec68d2` / https://github.com/LucianoMocchegiani/gym-bro/commit/6ec68d2
