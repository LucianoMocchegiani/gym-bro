# Credenciales de vínculo de acceso (stub)

**Fecha:** 2026-07-27  
**Roadmap:** E6 — Puerto AccessIdentityProvider + emitir/revocar  
**Commit:** `ed04f12` — feat(api): add access credential issue/revoke with stub provider  
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/ed04f12

## Resumen

Primer slice de acceso QR/SSI: puerto intercambiable, adapter stub y persistencia de credenciales de vínculo. Member y Staff pueden emitir/reemitir y revocar; aún no hay `POST /access/verify`.

## Cambios principales

- Tabla `access_credentials` + migración
- `AccessIdentityProvider` + `StubAccessIdentityProvider` (`ACCESS_PROVIDER=stub`)
- APIs `me/access-credential` y `members/:id/access-credentials`
- Docs, roadmap E6 parcial y carpeta Postman

## Decisiones

- Stub opaco (`stub:{uuid}`); venue `stub-venue:{tenantId}`
- Puerto soporta ambos modos de escaneo; verify/UI queda para el siguiente slice
- Permisos staff: `members.read` / `members.write`

## Validación

- `npx prisma generate` + `npm run build` (host)
- `migrate deploy` + seed en Docker
- Smoke: issue → GET → reissue → staff list/revoke → GET 404

## Referencias

- RN-ACC-001/002/003 · arquitectura §6 · `docs/09-esquema-db.md`
- Commit: `ed04f12` / https://github.com/LucianoMocchegiani/gym-bro/commit/ed04f12
