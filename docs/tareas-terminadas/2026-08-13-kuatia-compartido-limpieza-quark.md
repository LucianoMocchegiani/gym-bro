# Kuatia compartido + limpieza Quark

**Fecha:** 2026-08-13  
**Roadmap:** E6 / ops SSI — rename y simplificación post-migración Kuatia  
**Commit:** `7ba98e1` — feat(ssi): migrar a Kuatia compartido y eliminar bind Quark por tenant  
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/7ba98e1

## Resumen

Runtime SSI usa issuer/verifier Kuatia compartidos solo vía `KUATIA_*`. Se eliminó provision/bind por tenant, el módulo Nest pasó a `api/src/kuatia/`, Compose ya no levanta Quark local, y el package Dart queda en `identity_core_dart/` (raíz).

## Cambios principales

- Drop `tenants.quark_*` + enum; rename `packs.kuatia_*`
- Eliminar `POST …/quark/provision` y UI Super de reintento
- Path mobile → `../identity_core_dart`; docs 14/15 + README/Postman

## Decisiones

- Provision de wallets = consola Kuatia (no GymBro)
- Docs producto históricos no reescritos en masa (deuda en doc 15)

## Validación

- `prisma migrate deploy` + `prisma generate` en contenedor
- `npm run lint` / `npm run build` API OK; Nest arrancó tras regenerate

## Referencias

- [15-kuatia-deuda-rename.md](../15-kuatia-deuda-rename.md)
- Commit: `7ba98e1` / https://github.com/LucianoMocchegiani/gym-bro/commit/7ba98e1
