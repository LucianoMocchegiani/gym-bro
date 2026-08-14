# Cancelar contrato desde ficha afiliado

**Fecha:** 2026-08-13  
**Roadmap:** E10 — Cancelar contrato (thin gap)  
**Commit:** `24f9e11` — feat(web): cancelar contrato ACTIVE desde ficha afiliado  
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/24f9e11

## Resumen

Staff puede cancelar un contrato `ACTIVE` desde `/afiliados/[id]`: pierde acceso libre y créditos sin reembolsar el pago. Motivo opcional → auditoría.

## Cambios principales

- `cancelContract` en `web/lib/api/contracts.ts` (`PATCH /contracts/:id/status`)
- UI confirmación `CANCELAR` + motivo opcional en ficha
- Roadmap E10 marcado

## Decisiones

- Cancelar ≠ Devolver (`CANCELLED` vs `REFUNDED`)
- Motivo no se persiste en `contracts` (solo audit)

## Validación

- eslint OK en archivos tocados
- Prueba manual staff en ficha afiliado

## Referencias

- CU-CON-002, RN-SER-009
- Commit: `24f9e11` / https://github.com/LucianoMocchegiani/gym-bro/commit/24f9e11
