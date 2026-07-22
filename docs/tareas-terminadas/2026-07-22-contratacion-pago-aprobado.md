# Contratación tras pago aprobado (stub)

**Fecha:** 2026-07-22  
**Roadmap:** E3 — Contratación tras pago aprobado  
**Commit:** `ce47845` — feat(api): add contract creation after approved stub payment  
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/ce47845

## Resumen

Staff crea en una TX un Payment APPROVED (STUB/CASH) + Contract ACTIVE con saldos (`ContractCreditBalance` / `hasAccessLibre`). Member lista sus contratos en `GET /me/contracts`. Idempotencia opcional por `idempotencyKey`.

## Cambios principales

- Migración `20260722210000_contracts_payments` (`payments`, `contracts`, `contract_credit_balances`)
- Módulo `contracts/` Staff + Super + `/me/contracts`
- Audit `contract.create` + Postman carpeta Contracts

## Decisiones

- Pago stub aprobado en la misma TX (sin MP real)
- Saldos en tablas; MONTHLY endsAt=+1 mes; ONE_TIME usa `creditsExpireAt` o null
- Cancelación pack mixto diferida (RN-SER-009)

## Validación

- migrate deploy + lint/build + rutas Nest mapeadas
- Guía “Cómo probar” (Staff create/list, Member me, audit, idempotency)

## Referencias

- CU-CON-001
- Commit: https://github.com/LucianoMocchegiani/gym-bro/commit/ce47845
