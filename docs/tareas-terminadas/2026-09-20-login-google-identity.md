# Login con Google (identity)

**Fecha:** 2026-09-20
**Roadmap:** post-MVP app afiliado (corte B)
**Commit:** `b7591f3` — feat(auth): Google Sign-In for Faciliter identity
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/b7591f3

## Resumen

La app entra con Google (`id_token` → `POST /auth/google`). Crea o vincula `identities` por mail/`google_sub`. Password puede ser null. Package Android/iOS: `com.faciliter.mobile`. Admin web sigue password.

## Cambios principales

- `POST /auth/google` + `GOOGLE_OAUTH_CLIENT_IDS`
- Flutter `google_sign_in` + botón Continuar con Google
- Migración `password_hash` nullable

## Decisiones

- Client Web bakeado en `GoogleAuthConfig` (no es secreto)
- Client Android en Console (package + SHA debug); Play = otro SHA
- Apple y Google en Admin: después

## Validación

- Typecheck API + `dart analyze` auth
- Config Console (Android + Web); prueba en VPS pendiente del usuario

## Referencias

- `docs/99-backlog-post-mvp/app-afiliado.md`
- Commit: `b7591f3` / https://github.com/LucianoMocchegiani/gym-bro/commit/b7591f3
