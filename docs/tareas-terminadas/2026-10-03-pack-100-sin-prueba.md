# Pack Brain de 100 sin mes de prueba y conciliación del primer cobro

**Fecha:** 2026-10-03
**Roadmap:** Alta self-serve de gym (RN-PAG-017)
**Commit:** `1cc2e90` — feat(platform): pack de 100 sin mes de prueba y conciliación del primer cobro
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/1cc2e90

## Resumen

El pack `Faciliter Brain Basic de prueba` (100 ARS) se cobra desde el primer mes para validar el cobro real con Mercado Pago. La prueba de 30 días ahora depende del pack, no solo de la cuenta. Las altas sin prueba que esperan el primer cobro también se concilian consultando MP.

## Cambios principales

- `packs.offers_platform_trial` (default true); la migración lo pone en false para el pack `…016`. Seed y `prisma:upsert-platform-packs` alineados.
- Alta self-serve: `apply_trial` solo si el pack ofrece la prueba y la cuenta no la usó. `/empezar` avisa cuando el plan no tiene prueba.
- Caja de plataforma: el tilde de prueba se deshabilita con packs que no la ofrecen; el API lo rechaza.
- `/cuenta` y el job horario concilian también los `AWAITING_PAYMENT`: si la suscripción tiene un cobro aprobado (`authorized_payments/search`), nace el gym.
- Packs del staff y catálogo público exponen `offersPlatformTrial`.

## Decisiones

- Campo en el pack en vez de fijar el id en el código: sirve para cualquier pack de plataforma futuro.
- Los `AWAITING_PAYMENT` no vencen solos (MP reintenta el cobro varios días).

## Validación

- `npx tsc --noEmit` en API y web; eslint sin errores nuevos.
- Prueba en prod pendiente (`local/en-testeo/probar-pack-100-sin-prueba.md`).

## Referencias

- RN-PAG-017, `docs/09` §4.15 `packs` y §4.15h3, `docs/credenciales-demo.md`.
- Commit: `1cc2e90` / https://github.com/LucianoMocchegiani/gym-bro/commit/1cc2e90
