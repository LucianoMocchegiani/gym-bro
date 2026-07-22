# Packs catálogo: componentes + creditsExpireAt

**Fecha:** 2026-07-22  
**Roadmap:** E3 — CRUD pack; Componentes; Política vencimiento créditos  
**Commit:** `482762b` — feat(api): add catalog packs with components and expiry  
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/482762b

## Resumen

Quedó CRUD de packs con componentes anidados, `kind` inferido (`ACCESS`/`CREDITS`/`MIXED`), precio en pesos enteros, `billingPeriod` MONTHLY|ONE_TIME, `creditsExpireAt` opcional, validaciones estrictas, auditoría y Postman (env demo + carpeta Packs).

## Cambios principales

- Migración `20260722180000_packs` (`packs`, `pack_components`, `BillingPeriod`)
- Módulo `packs/` Staff + Super
- Environment Postman con `tenantId`, emails y passwords seed

## Decisiones

- Sin enum de tipo de pack (kind calculado)
- `creditsExpireAt` fecha absoluta nullable
- MONTHLY/ONE_TIME aplicables a libre y sesiones

## Validación

- migrate deploy + lint/build
- Push a `main`

## Referencias

- CU-SER-002, RN-SER-004..007
- Commit: https://github.com/LucianoMocchegiani/gym-bro/commit/482762b
