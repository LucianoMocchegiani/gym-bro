# Plataforma como tenant admin y handoff de impersonación

**Fecha:** 2026-09-28
**Roadmap:** Super Admin / post-MVP técnico (handoff)
**Commit:** `ec47120` — feat(platform): tenant admin, contratos TENANT y handoff de impersonacion
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/ec47120

## Resumen

La plataforma es el tenant `admin` (staff + permisos `platform.*`); no hay perfil `SUPER` ni rutas `/super`. Contratos de gym con Faciliter son `ContractType.TENANT`. Impersonar setea cookie `impersonation_handoff` (~60 s, Map en memoria) y el gym canjea JWT con `POST /auth/from-handoff` en `/login?handoff=1`.

## Cambios principales

- Drop perfil SUPER; `PlatformTenantGuard`; seed/login staff `admin`
- Migraciones TENANT contracts + drop SUPER
- Cookie de un uso + `Volver a plataforma` en `/cuenta`
- Panel tenants en `/tenants` (mismo Admin)

## Decisiones

- Store en memoria como Google `central_session` (sin tabla Prisma)
- Aterrizaje en `{slug}/login?handoff=1`
- QA web solo con HTTPS (`SameSite=None; Secure`); no `http://*.localhost`

## Validación

- `npx tsc --noEmit` en api y web
- Flujo browser en VPS / dominio HTTPS: pendiente del usuario

## Referencias

- [docs/20-handoff-impersonacion-entre-subdominios.md](../20-handoff-impersonacion-entre-subdominios.md)
- [docs/05-platform-contract-design.md](../05-platform-contract-design.md)
- Commit: `ec47120` / https://github.com/LucianoMocchegiani/gym-bro/commit/ec47120
