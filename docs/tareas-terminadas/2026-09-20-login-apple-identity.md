# Login con Apple (identity)

**Fecha:** 2026-09-20
**Roadmap:** post-MVP app afiliado (Corte C)
**Commit:** `afe3c03` — feat(auth): Sign in with Apple (Corte C)
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/afe3c03

## Resumen

La app entra con Apple Sign-In (`id_token` → `POST /auth/apple`). Crea o vincula `identities` por mail/`apple_sub`. Mismo patrón que Google (Corte B). Password puede ser null.

## Cambios principales

- `POST /auth/apple` + `APPLE_SERVICE_ID`, `APPLE_TEAM_ID`
- Flutter `sign_in_with_apple` + botón Continuar con Apple
- `AppleIdTokenService` con `jose` para verificar `id_token` (issuer, audience, email_verified)
- Migración `apple_sub` ya existente en `identities` (del corte A)

## Decisiones

- Mismo fluido que Google: busca por `appleSub`, luego por `email`, luego crea
- `jose` para JWT verification contra `appleid.apple.com/auth/keys`
- Apple en Admin web: después (el host ya es el gym)
- Widget `AppleAuthConfig.isEnabled` en `core/config`

## Validación

- `npx tsc --noEmit` ✅
- `fvm flutter analyze` ✅ (No issues found)
- Test funcional con cuenta Apple: pendiente del usuario

## Referencias

- `docs/99-backlog-post-mvp/app-afiliado.md`
- Commit: `afe3c03` / https://github.com/LucianoMocchegiani/gym-bro/commit/afe3c03
