# Cancelar reserva (ventana del gym)

**Fecha:** 2026-07-26  
**Roadmap:** E4 — Cancelar reserva (ventana del gym)  
**Commit:** `9b52413` — feat(api): cancel reservations within gym window settings  
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/9b52413

## Resumen

Member cancela dentro de la ventana (`reservationCancellationHours`, default 6). Staff/Super pueden fuera de ventana pero antes del inicio. Cancela → libera cupo, devuelve 1 crédito al saldo original, audit `reservation.cancel`. Idempotente si ya estaba CANCELLED.

## Cambios principales

- Migración `tenant_settings` + API `GET|PATCH /tenant-settings`
- `PATCH .../reservations/:id/status` (Member `/me/...`, Staff, Super)
- Postman Reservations + Tenant settings; docs README / arquitectura / esquema / roadmap

## Decisiones

- Default 6h; rango 0–720
- Staff sin ventana; Member sí
- Devolver crédito siempre al balance original
- Hook lista de espera no-op; modo lista espera en config pendiente

## Validación

- migrate + lint/build OK
- Prueba: cancelar CONFIRMED → bookedCount −1, créditos +1; cancelar ya CANCELLED → no-op

## Referencias

- CU-RES-003, RN-RES-003, RN-TEN-005
- Commit: https://github.com/LucianoMocchegiani/gym-bro/commit/9b52413
