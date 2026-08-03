# Offer OID4VCI al pack APPROVED (API)

**Fecha:** 2026-08-03  
**Roadmap:** Quark paso 3 (API) — bandeja Flutter pendiente (3b)  
**Commit:** `0931a26` — feat(api): OID4VCI credential offers on pack contract  
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/0931a26

## Resumen

Al contratar pack con pago APPROVED (stub/caja/MP) se crea un credential offer OID4VCI vía Quark (soft-fail). Tabla `credential_offers` slim, listados member/staff y `POST /contracts/:id/credential-offer` para re-oferta. Claims se reconstruyen desde el contrato; no se persisten.

## Cambios principales

- Migraciones `credential_offers` + slim (sin claims/config/vct/payment/session)
- `QuarkOfferService` + hooks en contracts
- `GET /me/credential-offers`, `GET /members/:id/credential-offers`, `POST /contracts/:id/credential-offer`
- Postman + docs 06/09/11/12/README; skills: endpoints nuevos → Postman

## Decisiones

- Soft-fail; un offer por contrato; reemitir desde contrato
- Respuesta API slim; `lastError` solo staff
- Estados: `PENDING` | `FAILED` (aceptación wallet = 3b)

## Validación

- Contrato stub → `PENDING` + `offerUri` (tras fix RabbitMQ en Quark MessagingClient, fuera de este repo)
- Re-oferta de `FAILED` → `PENDING`
- Postman requests añadidos

## Referencias

- [12-acceso-quark-oid4-diseno.md](../12-acceso-quark-oid4-diseno.md)
- Commit: `0931a26` / https://github.com/LucianoMocchegiani/gym-bro/commit/0931a26

**Nota:** el no-op RabbitMQ (`MessagingClient.connected`) vive en `ssi-quark/` (issuer/verifier); pushear esos repos por separado.
