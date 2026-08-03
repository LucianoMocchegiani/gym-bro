# Pack → metadata OID4VCI + seed Quark demo

**Fecha:** 2026-08-02
**Roadmap:** Quark paso 2 (pack → credentialConfigurations) + seed demo
**Commit:** `d060c71` — feat(api,web): pack OID4VCI metadata sync and Quark demo seed
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/d060c71

## Resumen

Al create/update de pack se hace PATCH de metadata OID4VCI en el issuer del gym (`pack_{id}` / `urn:gymbro:pack:{id}`) con soft-fail en `packs.quark_*`. El seed demo provisiona `gymbro-iss-demo` / `gymbro-ver-demo` y deja el tenant `demo` en `READY` (o `MISSING` si Quark falla). Fix de hidratación: tenants bajo `APP_DOMAIN`, no bajo `PLATFORM_HOST`.

## Cambios principales

- Migración `packs.quark_*` + `QuarkPackSyncService` en create/update pack
- Provision issuer con `oid4vc` mínimo; probe ghost OpenId4VcIssuerRecord
- Seed: `seed-quark-demo.ts` (HTTP soft-fail, timeout 60s)
- Doc `13-setup-db-desde-cero.md` + sync 09/11/12/06/README
- `tenant-host.ts`: origins estables SSR/cliente

## Decisiones

- Soft-fail pack y seed (no abortan flujo GymBro)
- Naming cerrado: `pack_{packId}` / `urn:gymbro:pack:{packId}`
- Seed Quark en fetch propio (sin Nest)

## Validación

- `migrate deploy` + `tsc` API OK
- Pack sync OK tras issuer con oid4vc
- Seed demo → `quark_status=READY` (re-seed tras timeout de create)

## Referencias

- [docs/12-acceso-quark-oid4-diseno.md](../12-acceso-quark-oid4-diseno.md)
- [docs/13-setup-db-desde-cero.md](../13-setup-db-desde-cero.md)
- Commit: `d060c71` / https://github.com/LucianoMocchegiani/gym-bro/commit/d060c71
