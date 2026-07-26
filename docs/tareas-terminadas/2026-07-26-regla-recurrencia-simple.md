# Regla de recurrencia simple

**Fecha:** 2026-07-26  
**Roadmap:** E4 — Regla de recurrencia simple  
**Commit:** `21c8a1c` — feat(api): add weekly session recurrence rules  
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/21c8a1c

## Resumen

Staff define un patrón semanal (días, hora local + timezone, cupo, profe, `startsOn`/`endsOn`) y el sistema materializa sesiones `PUBLISHED` en el calendario. Desactivar la regla no borra ni cancela sesiones ya generadas; editar una sesión es excepción local.

## Cambios principales

- Migración `20260726140000_session_recurrence_rules` (`Weekday`, `session_recurrence_rules`, `sessions.recurrenceRuleId`)
- API Staff `/api/session-recurrence-rules` + Super mirror
- Generación UTC desde hora local IANA; audit `session.recurrence.create` / `deactivate`
- Postman carpeta Session recurrence; docs README / arquitectura / esquema / roadmap

## Decisiones

- Solo patrón semanal con `weekdays`; rango obligatorio máx. 6 meses
- Sin regenerar serie al editar regla; sin chequeo de conflictos profe/sede en esta entrega
- `@RequirePermission` en métodos (no clase) para orden correcto de guards JWT → permiso

## Validación

- migrate deploy + lint/build OK
- Postman: login staff → POST regla → 201 con 9 sesiones; fix 401 por orden de guards

## Referencias

- CU-SER-004, RN-SER-012
- Commit: https://github.com/LucianoMocchegiani/gym-bro/commit/21c8a1c
