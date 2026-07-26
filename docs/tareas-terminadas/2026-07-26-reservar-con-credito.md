# Reservar sesión con crédito

**Fecha:** 2026-07-26  
**Roadmap:** E4 — Reservar con crédito  
**Commit:** `59c4cd8` — feat(api): reserve sessions by consuming pack credits  
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/59c4cd8

## Resumen

Member y Staff confirman reserva sobre sesión `PUBLISHED` futura consumiendo 1 crédito del servicio (saldo que vence antes). Incrementa `bookedCount`. Drop-in y cancelación con ventana diferidos.

## Cambios principales

- Migración `20260725180000_reservations_credit` (`reservations` + enums)
- Módulo `reservations/` Member `/me` + Staff + Super
- Estado de cuenta lista reservas próximas CONFIRMED
- Postman carpeta Reservations

## Decisiones

- Crédito automático (expiresAt más próximo; `contractId` opcional)
- Staff en nombre del afiliado incluido (CU-RES-002)
- Cancelación diferida a su tarea del roadmap

## Validación

- migrate deploy + lint/build OK
- Prueba Postman: re-contrato ACTIVE → reserva CONFIRMED / CREDIT

## Referencias

- CU-RES-001, CU-RES-002, RN-RES-001
- Commit: https://github.com/LucianoMocchegiani/gym-bro/commit/59c4cd8
