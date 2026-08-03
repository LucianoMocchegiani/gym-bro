# Bandeja Flutter OID4VCI + estado ACCEPTED

**Fecha:** 2026-08-03  
**Roadmap:** Quark paso 3b — accept wallet + cierre bandeja  
**Commit:** `85fa40a` — feat(mobile,api): OID4VCI accept bandeja and ACCEPTED status  
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/85fa40a

## Resumen

La app afiliado lista offers `PENDING`, acepta con `identity_core_dart` (secreto device-bound) y marca `ACCEPTED` en GymBro para que salgan de la bandeja. Issuer vía tunnel público; re-oferta staff fuerza offer nuevo en Quark.

## Cambios principales

- Flutter: `MemberWalletService`, bandeja Home, rewrite de hosts Docker → URL pública
- API: enum `ACCEPTED`, `POST /me/credential-offers/:id/accept`, re-oferta con `force`
- Compose: `BASE_URL`/`SERVICE_HOST` issuer (y verifier) públicos
- Postman + docs 06/09/11/12/README mobile

## Decisiones

- Marcar `ACCEPTED` solo si OID4VCI trajo ≥1 credencial
- Conservar `offerUri` al aceptar
- Staff re-oferta siempre crea offer nuevo (no reutiliza PENDING muerto)

## Validación

- Offer público GET 200 con URI `https://issuer.pruebasaproduccunon.uno/...`
- Aceptar en device demo → VC en wallet; bandeja vacía tras `ACCEPTED`
- Migración `20260803030000_credential_offer_accepted` aplicada

## Referencias

- [12-acceso-quark-oid4-diseno.md](../12-acceso-quark-oid4-diseno.md)
- Commit: `85fa40a` / https://github.com/LucianoMocchegiani/gym-bro/commit/85fa40a
