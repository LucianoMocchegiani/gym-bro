# Conectar cuenta Mercado Pago del gym

**Fecha:** 2026-07-26
**Roadmap:** E5 — Conectar cuenta MP del gym
**Commit:** `d1d8d0e` — feat(api): connect tenant Mercado Pago account credentials
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/d1d8d0e

## Resumen

Cada gym guarda su cuenta MP (`access_token` cifrado + `public_key`). Staff con `mp.connect` puede conectar, ver estado (sin secretos), probar y desconectar. Sin checkout ni OAuth en esta entrega.

## Cambios principales

- Tabla `mercadopago_accounts` + migración
- Módulo Nest con puerto/adapter (`validateAccessToken`) y APIs Staff/Super
- Env: `MP_CREDENTIALS_SECRET`, `MP_ACCOUNT_VALIDATE_MODE=live|stub`

## Decisiones

- Credenciales pegadas (no OAuth aún)
- Token cifrado AES-256-GCM; GET nunca lo expone
- Modo `stub` solo para local/Postman

## Validación

- migrate + lint/build OK
- Smoke: GET → PUT → POST test → DELETE con Staff seed

## Referencias

- CU-PAG-006, RN-PAG-001
- Commit: `d1d8d0e` / https://github.com/LucianoMocchegiani/gym-bro/commit/d1d8d0e
