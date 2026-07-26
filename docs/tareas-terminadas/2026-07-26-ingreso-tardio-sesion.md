# Ingreso tardío a sesión

**Fecha:** 2026-07-26  
**Roadmap:** E4 — Ingreso tardío a sesión (si config ON)  
**Commit:** `5bee936` — feat(api): allow late session entry when gym config is ON  
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/5bee936

## Resumen

Flag `allowLateSessionEntry` en `tenant_settings` (default OFF). Con ON, reserva/crédito (y join/promote waitlist) se permiten entre `startsAt` y `endsAt`. Sesión terminada siempre rechaza.

## Cambios principales

- Migración `allow_late_session_entry` + API settings
- Validación compartida `assertSessionOpenForBooking` en reservas y waitlist
- Docs README / arquitectura / esquema / roadmap; Postman

## Decisiones

- Default OFF (opt-in del gym)
- Ventana hasta `endsAt` (no minutos fijos desde start)
- Solo crédito en este slice; drop-in pendiente

## Validación

- migrate + lint/build OK
- Prueba: flag OFF → 400 started; flag ON → 201 CONFIRMED + crédito −1

## Referencias

- CU-RES-006, RN-RES-006
- Commit: https://github.com/LucianoMocchegiani/gym-bro/commit/5bee936
