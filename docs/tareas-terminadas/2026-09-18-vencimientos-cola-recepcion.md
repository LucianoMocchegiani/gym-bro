# Vencimientos: cola de recepción (corte 1)

**Fecha:** 2026-09-18
**Roadmap:** post-MVP Admin (avisos = E8)
**Commit:** `7b8a79b` — feat(admin): Vencimientos worklist from MONTHLY contracts
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/7b8a79b

## Resumen

Lista operativa de packs MONTHLY por vencer (7 días) o en tolerancia de deuda. No es entidad nueva ni reporte: lee `contracts.ends_at`, mandato de débito y `tenant_settings.debt_tolerance_days`. Acciones: ficha, Caja, Débitos. Sin WhatsApp/mail.

## Cambios principales

- `GET /expirations` (`members.read`)
- Admin `/vencimientos` en Operación
- Postman Expirations; MCP help `vencimientos`

## Decisiones

- Un contrato por afiliado (ACTIVE gana a EXPIRED)
- Caja/Débitos solo con `cashier.operate`

## Validación

- `tsc` API y web
- Prueba manual de filtros y atajos Caja

## Referencias

- `docs/99-backlog-post-mvp/admin.md`
- `docs/07-wireframes-ascii.md` §7
- RN-CON-001 / RN-ACC-005
- Commit: `7b8a79b` / https://github.com/LucianoMocchegiani/gym-bro/commit/7b8a79b
