# Google Identity en apex reutilizando el login proxy

**Fecha:** 2026-09-29
**Roadmap:** follow-up de self-serve landing (contratar con cuenta Faciliter)
**Commit:** `a2fd8a7` — feat(auth): Google Identity en apex reutilizando el login proxy
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/a2fd8a78db04a29755d7cd2814d360888f42950c

## Resumen

En `faciliter.xyz/login` se entra y se crea cuenta con el mismo **Continuar con Google** que el staff (`login.faciliter.xyz` + cookie `central_session`). El canje sin `tenantSlug` emite JWT Identity.

## Cambios principales

- `POST /auth/from-cookie` opcional `tenantSlug` → Identity o STAFF/MEMBER
- `ensureIdentityFromGoogle` compartido con `POST /auth/google`
- `ContinueWithGoogleButton` + canje de cookie en `IdentityLoginCard`

## Decisiones

- No hay un OAuth distinto en el apex: mismo proxy que el gym

## Validación

- `npx tsc --noEmit` en `api` y `web`
- Prueba en VPS: apex Google → Identity → `/cuenta`; slug demo sigue exigiendo membresía

## Referencias

- `docs/06-arquitectura.md`
- `docs/99-backlog-post-mvp/21-guia-pruebas-auth-proxy.md` (§2e)
- Commit: `a2fd8a7` / https://github.com/LucianoMocchegiani/gym-bro/commit/a2fd8a78db04a29755d7cd2814d360888f42950c
