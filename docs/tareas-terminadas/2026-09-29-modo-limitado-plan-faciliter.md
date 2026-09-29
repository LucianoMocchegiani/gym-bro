# Modo limitado tras gracia de plan Faciliter

**Fecha:** 2026-09-29
**Roadmap:** post-MVP producto (planes Faciliter)
**Commit:** `6ce9cc9` — feat(platform): recortar el gym tras 3 dias sin plan Faciliter
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/6ce9cc9169070bc66fe5a4c28424f4a3a03449a3

## Resumen

Sin `TENANT` vigente y pasados 3 días, el staff entra pero no opera. API 403 salvo Plan / permisos; el panel deja solo Plan / Uso, banner y popup. Demo y `admin` no se recortan.

## Cambios principales

- `PlatformAccessGuard` en `@RequireTenantAuth` + `@AllowWhenLimited`
- `GET /auth/me.platformAccess`
- Nav, redirect, banner/popup en Admin

## Decisiones

- Allowlist por id (`…0001`, `…0002`), no por “nunca tuvo plan”
- Impersonación y MEMBER sin recorte

## Validación

- `tsc --noEmit` (API y web)
- Guía: gym nuevo con `created_at` atrasado 4 días

## Referencias

- RN-PAG-018, CU-PAG-011
- Commit: `6ce9cc9` / https://github.com/LucianoMocchegiani/gym-bro/commit/6ce9cc9169070bc66fe5a4c28424f4a3a03449a3
