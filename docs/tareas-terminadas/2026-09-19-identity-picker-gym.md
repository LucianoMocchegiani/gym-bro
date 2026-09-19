# Identity: cuenta Faciliter y picker de gym

**Fecha:** 2026-09-19
**Roadmap:** post-MVP app afiliado (corte A)
**Commit:** `2b7bb23` — feat(auth): Faciliter identity and gym picker
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/2b7bb23

## Resumen

La app entra con email+password de `identities` (sin slug). Luego elige gym y perfil; el JWT de negocio sigue siendo MEMBER/STAFF + tenantId. La pass no está en `members`/`staff_users`. Wallet de la persona: cambiar gym no la borra.

## Cambios principales

- `GET /auth/memberships` + `POST /auth/select-context` + `POST /auth/identity/login`
- App: picker y “Cambiar gym”
- Admin web sigue `staff/login` (valida hash de identity)

## Decisiones

- Vínculo = alta del gym por email
- Google/Apple fuera de este corte

## Validación

- Prueba en app y migrate (usuario)

## Referencias

- `docs/99-backlog-post-mvp/app-afiliado.md`
- Commit: `2b7bb23` / https://github.com/LucianoMocchegiani/gym-bro/commit/2b7bb23
