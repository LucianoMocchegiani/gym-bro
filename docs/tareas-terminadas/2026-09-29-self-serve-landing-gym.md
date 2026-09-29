# Alta self-serve de gym desde la landing

**Fecha:** 2026-09-29
**Roadmap:** post-MVP producto (planes Faciliter)
**Commit:** `cb729f3` — feat(platform): alta self-serve de gym desde la landing
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/cb729f3b52367011e8f7744bf35093a74c3eb64e

## Resumen

En el apex se elige un pack, se entra con Identity y se autoriza la suscripción en Mercado Pago de `admin`. Con prueba el gym nace al autorizar el preapproval; sin prueba, en el primer cobro. `/cuenta` lista los gyms y muestra el plan de solo lectura.

## Cambios principales

- Tabla `platform_signups` + `POST /identity/signups`
- Webhook `subscription_preapproval` / cobro
- Landing Contratar, `/empezar`, login Identity, `/cuenta` apex

## Decisiones

- Corte A: sin cambiar pack ni baja de débito
- Calendly queda como vía secundaria

## Validación

- `prisma generate` y `tsc --noEmit` (API y web)
- Prueba en VPS a cargo del usuario (migrate + MP de `admin`)

## Referencias

- RN-PAG-017, `docs/ideas/2026-09-28-planes-landing-modulos.md`
- Commit: `cb729f3` / https://github.com/LucianoMocchegiani/gym-bro/commit/cb729f3b52367011e8f7744bf35093a74c3eb64e
