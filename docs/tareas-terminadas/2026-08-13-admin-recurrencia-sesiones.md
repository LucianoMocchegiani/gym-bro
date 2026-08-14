# Recurrencia de sesiones en Admin

**Fecha:** 2026-08-13  
**Roadmap:** E10 — Recurrencia de sesiones (UI)  
**Commit:** `270afda` — feat(web): recurrencia de sesiones en Admin  
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/270afda

## Resumen

Staff puede crear reglas semanales (toggle en `/sesiones/nuevo`) y listar/desactivar en `/sesiones` (vista Recurrencias). Timezone fija `America/Asuncion`.

## Cambios principales

- Cliente `web/lib/api/recurrence-rules.ts`
- Alta recurrente + listado/desactivar
- Backlog: desactivar debería cancelar sesiones futuras
- Postman ejemplo TZ Asunción

## Decisiones

- Desactivar hoy solo marca `active` (cancelar serie → backlog)
- Sin instructor/sucursal en el form (como puntual)

## Validación

- Prueba manual Admin; web recreado

## Referencias

- CU-SER-004 / RN-SER-012
- Commit: `270afda` / https://github.com/LucianoMocchegiani/gym-bro/commit/270afda
