# Cuenta Identity en apex (AccountPanel)

**Fecha:** 2026-09-29
**Roadmap:** follow-up self-serve / UX apex
**Commit:** `501ae3b` — feat(web): cuenta Identity reutiliza AccountPanel sin flash de login
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/501ae3bf3274c6ddc12efba8b480bd809615aa64

## Resumen

Sin sesión el apex va a `/login` (con “Cargando sesión…”). Con sesión, `/cuenta` reutiliza `AccountPanel` (logout y contraseña) y debajo **Mis tenants** + plan del seleccionado.

## Cambios principales

- `LoginPending` en login Identity y staff (cookie)
- Nav marketing: Entrar / Mi cuenta
- `POST /auth/change-password` también para JWT Identity

## Decisiones

- Mismo patrón que el gym: login y cuenta en URLs distintas
- Copy “tenants” (gym, club o estudio)

## Validación

- `npx tsc --noEmit` en `api` y `web`
- Prueba en VPS a cargo del usuario

## Referencias

- `docs/07-wireframes-ascii.md` §17
- Commit: `501ae3b` / https://github.com/LucianoMocchegiani/gym-bro/commit/501ae3bf3274c6ddc12efba8b480bd809615aa64
