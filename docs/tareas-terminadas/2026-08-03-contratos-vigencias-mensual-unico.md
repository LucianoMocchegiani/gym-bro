# Vigencias de contratos MONTHLY / ONE_TIME

**Fecha:** 2026-08-03  
**Roadmap:** E3 — Contratación tras pago aprobado (RN-CON)  
**Commit:** `9b73e3e` — feat(api): vigencias MONTHLY/ONE_TIME y fechas opcionales en contratos  
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/9b73e3e

## Resumen

Contratos mensuales apilan por mismo pack (un plan activo, `startsAt` = max `endsAt` vivo) y los únicos pueden solapar (default +1 mes). Fechas opcionales en el alta (RN-CON-004). Re-oferta OID4VCI vía re-POST del contrato con la misma `idempotencyKey` (`force`); se eliminó `POST /contracts/:id/credential-offer`.

## Cambios principales

- `resolveContractPlan` / solape MONTHLY / créditos alineados a `endsAt`
- DTO: `startsAt` / `endsAt` opcionales
- Re-oferta por idempotencia + `force` en Quark offer
- Docs RN/CU/09/11/12 + Postman packs/contratos MONTHLY y ONE_TIME

## Decisiones

- MONTHLY: solo `startsAt` opcional; `endsAt` en body → 400
- ONE_TIME: `startsAt` y/o `endsAt` opcionales
- Misma `idempotencyKey` = re-oferta forzada, no contrato duplicado

## Validación

- Prueba manual: apilado mismo pack + fechas override ONE_TIME
- Colección Postman con requests mensuales/únicos

## Referencias

- [04-reglas-de-negocio.md](../04-reglas-de-negocio.md) (RN-CON-001–004)
- Commit: `9b73e3e` / https://github.com/LucianoMocchegiani/gym-bro/commit/9b73e3e
