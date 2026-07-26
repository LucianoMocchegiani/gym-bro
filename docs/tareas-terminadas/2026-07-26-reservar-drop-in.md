# Reservar drop-in (pago stub/caja)

**Fecha:** 2026-07-26  
**Roadmap:** E4 — Reservar drop-in (pago)  
**Commit:** `628e11a` — feat(api): reserve sessions with drop-in stub/cash payment  
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/628e11a

## Resumen

Staff reserva en nombre del afiliado con `coverage=DROP_IN`: crea Payment APPROVED (STUB/CASH) al precio `service.dropInPrice` y confirma la reserva sin consumir créditos. Member no puede crear drop-in. Cancelación libera cupo; el pago no se reembolsa (E5).

## Cambios principales

- `dropInPrice` en servicios POR_SESIONES; enum `DROP_IN`; `reservations.payment_id` + FKs crédito nullable
- Staff `POST .../reservations` con coverage/method/idempotencyKey
- Docs README / arquitectura / esquema / roadmap; Postman

## Decisiones

- Precio en servicio (null = drop-in off)
- Solo staff en este slice
- Idempotencia por `idempotencyKey` como contratos
- Reembolso diferido a E5

## Validación

- migrate + lint/build OK
- Prueba: PATCH dropInPrice 8000 → POST DROP_IN CASH → 201, paymentAmount 8000, sin crédito; socio con reserva previa → 409

## Referencias

- CU-RES-001/002, RN-RES-001, RN-SER-006, RN-PAG-004
- Commit: https://github.com/LucianoMocchegiani/gym-bro/commit/628e11a
