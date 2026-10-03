# Suscripción Mercado Pago sin plan (alta del gym y débito de Caja)

**Fecha:** 2026-10-02
**Commit:** `a59c745` — fix(mp): suscripcion sin plan asociado para alta del gym y debito de Caja
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/a59c7452172e30ab3ea3cdf1013224fe88358ccf

## Resumen

En producción, `/empezar` fallaba con "card_token_id is required": MP exige tarjeta tokenizada y status `authorized` en suscripciones con `preapproval_plan_id`. Ahora el API crea el `preapproval` `pending` sin plan y devuelve el `init_point`, donde el cliente carga el medio de pago. Mismo arreglo en el débito de Caja.

## Cambios principales

- Fuera `createPreapprovalPlan` del puerto y del adapter MP; `createPreapproval` sin `planId`.
- Alta self-serve (`platform-signup.service.ts`), alta de débito y Próximo pack (`debit.service.ts`) sin plan.
- Docs: RN-PAG-013, CU-PAG-008/010, `06` §7.5, glosario, esquema (`mp_preapproval_plan_id` legado), P9j, help `debito` / `mercadopago`.

## Decisiones

- Cada suscripción guarda el precio de su alta; un precio nuevo aplica al regenerar el link o con Próximo pack (la actualización por plan nunca estuvo implementada).
- Sin migración: la columna del plan queda null en altas nuevas.

## Validación

- `tsc --noEmit` en `api`.
- Prueba en producción pendiente del deploy (`local/en-testeo/probar-suscripcion-sin-plan.md`). Requiere `PUBLIC_WEB_BASE_URL` y `PUBLIC_API_BASE_URL` públicas en `api/.env`.

## Referencias

- Mercado Pago: suscripciones sin plan asociado con pago pendiente.
- `docs/05-casos-de-uso/pagos-caja.md`, `docs/04-reglas-de-negocio.md` (RN-PAG-013).
- Commit: `a59c745` / https://github.com/LucianoMocchegiani/gym-bro/commit/a59c7452172e30ab3ea3cdf1013224fe88358ccf
