# Plan del gym y prueba de 30 días en Caja

**Fecha:** 2026-09-29
**Roadmap:** post-MVP producto (planes Faciliter)
**Commit:** `1f873a0` — feat(platform): plan del gym y prueba de 30 dias en Caja
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/1f873a0f2da027b3658a6a5ca9713a10d831d16c

## Resumen

El gym ve su contrato Faciliter en Sistema → Plan / Uso. Caja de `admin` crea el contrato TENANT (cobro o 30 días $0). La prueba es una vez por Identity dueña y una vez por tenant (RN-PAG-017).

## Cambios principales

- `ownerIdentityId` y flags de prueba en Identity/Tenant; `isPlatformTrial` en Contract
- Caja plataforma: tilde de prueba (efectivo) + contrato TENANT también en cobro pago
- `GET /plan` y pantalla Plan / Uso
- Fuera de este corte: self-serve apex y débito MP de plataforma

## Decisiones

- Prueba 30 días, cualquier pack, una vez por cuenta y por gym; Caja opcional (tilde)
- MP + prueba rechazado hasta el mandato de plataforma

## Validación

- `npx prisma generate` y `tsc --noEmit` (API y web)
- Prueba manual: migrate + Caja admin tilde + Plan / Uso en el gym

## Referencias

- `docs/04-reglas-de-negocio.md` RN-PAG-017
- `docs/ideas/2026-09-28-planes-landing-modulos.md`
- Commit: `1f873a0` / https://github.com/LucianoMocchegiani/gym-bro/commit/1f873a0f2da027b3658a6a5ca9713a10d831d16c
