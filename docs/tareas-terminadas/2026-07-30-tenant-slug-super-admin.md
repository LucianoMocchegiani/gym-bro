# Tenant slug (subdominio) + Super Admin web

**Fecha:** 2026-07-30  
**Roadmap:** E10 — Super Admin UI + login Staff por slug  
**Commit:** `973bd2c` — feat(web,api): tenant slug subdomains and Super Admin UI  
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/973bd2c

## Resumen

Staff entra por `{slug}.localhost:3000` sin UUID. Super Admin en `/super` con sesión separada. Tenant tiene `slug` UNIQUE; login acepta `tenantSlug` o `tenantId`.

## Cambios principales

- Prisma `tenants.slug` + migración + seed `demo`
- `GET /public/tenants/by-slug/:slug`; create/update con slug
- Staff login por `tenantSlug`; CORS `*.localhost`
- Super UI `/super/login` + tenants; Staff login por Host
- Postman: by-slug + login by slug

## Decisiones

- Dev: subdominio `slug.localhost` (no path `/t/...`)
- Slug del Host en SSR (`headers()`) para evitar hydration mismatch

## Validación

- Login `http://demo.localhost:3000/login` (email/password)
- Super `http://localhost:3000/super/login` → listado con link al slug
- SSR HTML con Host `demo.localhost` renderiza el form (no “Elegí tu gym”)

## Referencias

- `docs/11-roadmap-mvp.md` · `docs/09-esquema-db.md` · `web/README.md` · `docs/credenciales-demo.md`
- Commit: `973bd2c` / https://github.com/LucianoMocchegiani/gym-bro/commit/973bd2c
