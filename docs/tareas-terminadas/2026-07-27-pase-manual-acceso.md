# Pase manual de acceso + auditoría

**Fecha:** 2026-07-27  
**Roadmap:** E6 — Pase manual + auditoría  
**Commit:** `e220110` — feat(api): add staff manual access pass with audit  
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/e220110

## Resumen

Staff otorga ingreso sin QR a un afiliado ACTIVE, con motivo cerrado y nota opcional. Queda intento `manualPass` + evento de auditoría; no consume el tope diario de multi-ingreso QR.

## Cambios principales

- `POST /members/:id/access/manual-pass` (`access.manual_pass`)
- Campos `motive_code` / `note` en `access_attempts`
- `sessionId` opcional para marcar presente

## Decisiones

- Saltea evaluación automática completa; pases manuales no cuentan para multi-ingreso

## Validación

- Smoke: allow + audit `access.manual_pass`

## Referencias

- CU-ACC-004 · RN-ACC-006 · RN-ROL-008
- Commit: `e220110` / https://github.com/LucianoMocchegiani/gym-bro/commit/e220110
