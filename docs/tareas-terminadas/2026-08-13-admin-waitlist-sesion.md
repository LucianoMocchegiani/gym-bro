# Waitlist operativa staff en sesión

**Fecha:** 2026-08-13  
**Roadmap:** E10 — Waitlist operativa (staff)  
**Commit:** `4fdb021` — feat(api,web): waitlist operativa staff en sesion  
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/4fdb021

## Resumen

Staff ve y gestiona la lista de espera de una sesión en `/sesiones/[id]`: cola FIFO, alta a nombre del afiliado y quitar. Se muestra el `waitlistMode` del gym; la promoción AUTO ya existía en API.

## Cambios principales

- Cliente `web/lib/api/waitlist.ts` + panel debajo del roster
- API: query `status` / `allStatuses` en `GET /sessions/:id/waitlist`
- Postman + roadmap E10

## Decisiones

- Misma página que el roster; filtro En cola / Todas
- Modos 2/3 de confirmación sin UI nueva (diferidos)

## Validación

- `tsc` API y web OK
- Docker recreate api/web; prueba manual guiada

## Referencias

- CU-RES-004 / CU-RES-005
- Commit: `4fdb021` / https://github.com/LucianoMocchegiani/gym-bro/commit/4fdb021
