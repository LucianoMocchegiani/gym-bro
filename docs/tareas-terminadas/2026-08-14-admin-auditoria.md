# Página de auditoría Admin

**Fecha:** 2026-08-14  
**Roadmap:** E10 — Auditoría UI  
**Commit:** `de3f3b3` — feat(web): pagina de auditoria con detalle before/after  
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/de3f3b3

## Resumen

Staff con `audit.read` puede listar eventos en `/auditoria`, filtrar por acción y ver before/after en detalle expandible. Nav Sistema + atajo en Inicio.

## Cambios principales

- Cliente `web/lib/api/audit.ts` + página `/auditoria`
- Contraste del JSON con tokens de tema
- Roadmap / arquitectura

## Decisiones

- Búsqueda `q` (sin select de acciones)
- Sin UI Super en este corte

## Validación

- `tsc` web OK; prueba manual detalle `payment.refund`

## Referencias

- CU-ROL-007 / RN-ROL-008
- Commit: `de3f3b3` / https://github.com/LucianoMocchegiani/gym-bro/commit/de3f3b3
