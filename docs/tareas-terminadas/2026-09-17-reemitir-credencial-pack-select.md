# Re-emitir credencial: select de pack vigente

**Fecha:** 2026-09-17
**Roadmap:** E6 — OID4VCI / CU-AFI-006
**Commit:** `553d335` — feat(web): select covering pack when reissuing member credential
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/553d3351649d07d8d77a475981a6d6369370c42b

## Resumen

El panel de credencial del afiliado lista los packs que cubren hoy. El default sigue siendo el contrato de `startsAt` más reciente; staff puede elegir otro (p. ej. MONTHLY vs drop-in) y reemitir solo esa VC.

## Cambios principales

- `POST /members/:id/credential-offers` acepta `packId` opcional
- Select en `MemberCredentialPanel` sobre `GET …/account?coverage=current`
- Postman y CU-AFI-006

## Decisiones

- Select por pack, no por cada contrato ONE_TIME (una oferta por socio+pack)
- Solo cobertura de hoy; renovación futura no entra

## Validación

- `npx tsc --noEmit` en `api` y `web`
- Prueba manual: ficha con mensual + clase suelta, cambiar select y reemitir el MONTHLY

## Referencias

- CU-AFI-006, `docs/05-casos-de-uso/afiliados.md`
- Commit: `553d335` / https://github.com/LucianoMocchegiani/gym-bro/commit/553d3351649d07d8d77a475981a6d6369370c42b
