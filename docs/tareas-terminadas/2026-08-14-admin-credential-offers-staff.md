# Credential offers staff en ficha afiliado

**Fecha:** 2026-08-14
**Roadmap:** E10 — credential-offers staff
**Commit:** `0442c75` — feat(web): credential offers staff en ficha afiliado
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/0442c75

## Resumen

En `/afiliados/[id]` el staff ve credential offers OID4VCI (status, lastError), puede copiar el `offerUri` y re-emitir vía re-POST del contrato con la misma `idempotencyKey`.

## Cambios principales

- Cliente `listMemberCredentialOffers` + `reissueCredentialOffer`
- Panel en ficha afiliado
- Roadmap + pruebas A4/A5

## Decisiones

- Listado + re-emitir + copiar URI (sin QR)
- Sin filtro de status en UI

## Validación

- `npx tsc --noEmit` en `web`

## Referencias

- `GET /members/:id/credential-offers` · re-POST `…/contracts` misma key
- Commit: `0442c75` / https://github.com/LucianoMocchegiani/gym-bro/commit/0442c75
