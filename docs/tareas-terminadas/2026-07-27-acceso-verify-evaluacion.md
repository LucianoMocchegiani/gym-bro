# Acceso verify + evaluación + historial

**Fecha:** 2026-07-27  
**Roadmap:** E6 — `POST /access/verify` + evaluación + historial  
**Commit:** `a3dd474` — feat(api): add access verify evaluation and attempt history  
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/a3dd474

## Resumen

Staff verifica ingreso QR (ambos modos), evalúa libre/reserva, tolerancia de deuda (placeholder 0 días) y multi-ingreso. Persiste intentos y marca presente en reserva cuando aplica.

## Cambios principales

- `POST /access/verify` + `GET /access-attempts` (`access.verify`)
- Tabla `access_attempts`, `reservations.checked_in_at`
- Settings: `debtToleranceDays`, `multiEntryEnabled`, `multiEntryMaxPerDay`

## Decisiones

- Verify solo Staff; deuda real diferida; pase manual fuera de alcance

## Validación

- Smoke local + pruebas Postman (allow, credencial inválida, multi_ingreso_excedido)

## Referencias

- CU-ACC-001..003/005/007 · RN-ACC-004..009 · RN-RES-007
- Commit: `a3dd474` / https://github.com/LucianoMocchegiani/gym-bro/commit/a3dd474
