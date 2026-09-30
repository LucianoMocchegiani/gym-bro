# N1: renovación débito/caja y avisos de plan Faciliter

**Fecha:** 2026-09-30
**Roadmap:** E8 — vencimiento socio + plan `TENANT`
**Commit:** `d959948` — feat(notifications): renovación débito vs caja y avisos de plan Faciliter
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/d95994866e61e4fe190276b87f3ea927afe79031

## Resumen

El socio recibe aviso de pack por vencer distinto si paga a mano o con débito, más cobro MP rechazado y mandato fallido. El dueño del gym recibe el mismo ciclo por mail (Identity) para el plan Faciliter: cobro, renovación, gracia de 3 días y fallos de débito de plataforma.

## Cambios principales

- Eventos `CONTRACT_EXPIRING_DEBIT`, `DEBIT_*` y `PLATFORM_*`
- Cron E2 por `payKind`; `notifications.identity_id`
- Webhooks débito socio y signup/preapproval de plataforma

## Decisiones

- Plantillas de plan: fijas Faciliter (no `/avisos` del gym)
- Sin bandeja staff en web; mail al dueño

## Validación

- `prisma generate`; `nest build`
- Recorrido caja/débito/cron a cargo del usuario
- Migrar `20260930200000`, `210000` y `211000` en cada ambiente

## Referencias

- RN-NOT-002 · N10–N15 en `docs/08-casos-prueba-manuales.md`
- Commit: `d959948` / https://github.com/LucianoMocchegiani/gym-bro/commit/d95994866e61e4fe190276b87f3ea927afe79031
