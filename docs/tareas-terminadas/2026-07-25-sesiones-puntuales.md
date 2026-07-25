# Sesiones puntuales de calendario

**Fecha:** 2026-07-25  
**Roadmap:** E4 — Crear sesión puntual  
**Commit:** `781d84b` — feat(api): add one-off calendar sessions for staff  
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/781d84b

## Resumen

Staff publica, edita y cancela sesiones de un servicio `POR_SESIONES`. Profesor opcional (StaffUser), sede opcional (default), cupo con `bookedCount` en 0. Recurrencia, reservas y lista de espera diferidas.

## Cambios principales

- Migración `20260725150000_sessions` (enum `SessionStatus` + tabla `sessions`)
- Módulo `sessions/` Staff + Super
- Audit `session.create` / `session.update` / `session.cancel`
- Postman carpeta Sessions

## Decisiones

- Create siempre `PUBLISHED` (sin draft)
- `startsAt` + `endsAt` (valida orden); `instructorId` = StaffUser
- `capacity` no puede bajar de `bookedCount`
- Cancelar vía `PATCH { status: CANCELLED }`

## Validación

- migrate deploy + generate + lint/build OK
- Prueba manual Postman (create/list/patch/cancel)

## Referencias

- CU-SER-003, RN-SER-010, RN-SER-011, RN-SER-013
- Commit: https://github.com/LucianoMocchegiani/gym-bro/commit/781d84b
