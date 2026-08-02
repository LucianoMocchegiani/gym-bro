# Spike Quark: issuer/verifier en Compose + provision al crear tenant

**Fecha:** 2026-08-02
**Roadmap:** E6 — Spike Quark Compose + provision tenant
**Commit:** `5c08488` — feat(api,web,docker): Quark issuer/verifier spike on tenant create
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/5c08488

## Resumen

Al crear un gym, GymBro intenta dar de alta issuer + verifier Quark (`gymbro-iss-{slug}` / `gymbro-ver-{slug}`), guarda DIDs/refs y expone estado `READY` | `MISSING` con reintento Super. Soft-fail: el tenant se crea aunque Quark falle o tarde. Compose incluye issuer, verifier, DBs Quark y pgAdmin (sin RabbitMQ).

## Cambios principales

- Compose: `quark-issuer`, `quark-verifier`, init SQL Quark, pgAdmin + volumen
- Prisma: columnas `quark_*` + enum `QuarkProvisionStatus`
- API: módulo Quark, provision async al create, `POST /tenants/:id/quark/provision`
- Super UI: columna Quark + panel Reintentar
- Docs: diseño `12-acceso-quark-oid4-diseno.md` + sync arquitectura/roadmap/README
- `ssi-quark/` gitignore (solo README de clon local)

## Decisiones

- Soft-fail + estado visible + reintento (no hard-fail)
- Sin RabbitMQ/VDR en Compose (mensajería best-effort)
- Clones Quark fuera del monorepo versionado
- Create tenant no bloquea esperando Quark (timeout HTTP + fire-and-forget)

## Validación

- Health Quark `/v1/health` OK
- Migración `tenant_quark_provision` aplicada
- Tenant `luciano` en DB con `quark_status=READY` e issuer/verifier/DID
- pgAdmin en http://localhost:5050

## Referencias

- [docs/12-acceso-quark-oid4-diseno.md](../12-acceso-quark-oid4-diseno.md)
- [docs/06-arquitectura.md](../06-arquitectura.md) §6.2b
- Commit: `5c08488` / https://github.com/LucianoMocchegiani/gym-bro/commit/5c08488
