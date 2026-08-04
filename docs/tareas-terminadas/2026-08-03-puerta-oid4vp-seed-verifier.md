# Puerta OID4VP + seed verifier con oid4vp

**Fecha:** 2026-08-03  
**Roadmap:** E6 — acceso OID4VP (modo B)  
**Commit:** `57e849f` — feat(access,quark): puerta OID4VP real y seed verifier con oid4vp  
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/57e849f

## Resumen

Acceso por puerta usa solo OID4VP real (sin stubs): Staff crea request, `/puerta` muestra QR `requestUri`, poll de sesión → claim `memberId` → evaluate. El seed/provision de Quark envía `oid4vp` y exige `OpenId4VcVerifierRecord` con `verifierId = gymbro-ver-{slug}` para evitar `request_uri` con UUID random (404).

## Cambios principales

- API `POST /access/oid4vp/request` + `GET /access/oid4vp/session/:id`; retiro stub/check-in/`access-credentials`
- Decode SD-JWT de `vp_token` en GymBro; adapter Quark OID4VP
- Web `/puerta` + Postman Access OID4VP
- Seed + `QuarkProvisionService`: `oid4vp.clientMetadata` + probe `OpenId4VcVerifierRecord` / `listVerifierRecords`

## Decisiones

- Solo modo B (afiliado escanea QR de puerta)
- Sin fallback stub
- Identidad = claim `memberId` de la VC
- Quark no se modificó (sin cambios en getSession enriquecido)

## Validación

- `compose down -v` + up + migrate + seed → Quark `READY`
- `GET …/verifiers/gymbro-ver-demo/records?type=OpenId4VcVerifierRecord` → `verifierId=gymbro-ver-demo`
