# Alta web del socio recién con el pago aprobado

**Fecha:** 2026-10-03
**Roadmap:** Post-MVP — portal web del afiliado (ajuste de la fase 1)
**Commit:** `5033cae` — feat(members): alta web del socio recién con el pago aprobado
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/5033cae

## Resumen

Antes, quien compraba en la web del gym quedaba como socio activo apenas cargaba sus datos, pagara o no. Ahora la web guarda una solicitud de alta y abre Mercado Pago, y el socio se crea recién cuando el pago se aprueba. Si no paga, no aparece en Afiliados. Quien ya es socio solo paga el pack, como antes.

## Cambios principales

- Tabla `member_signups` (migración `20261003200000_member_signups`): pack, monto, nombre, DNI, teléfono, estado y el socio/cobro nacidos.
- `POST /identity/member-signups` valida antes de cobrar (gym activo, que no sea socio, DNI/mail libres) y devuelve el checkout MP del gym con `externalReference` = solicitud. `GET /identity/member-signups/:id` da el estado. Se fue `POST /identity/memberships`.
- Webhook (`payment` y `merchant_order`): con el pago aprobado, `MemberSignupService.fulfillPaid` crea el socio (`member.self_join`) y el cobro del pack, y lo confirma con `applyRemoteStatusCart` (contrato, caja, comprobante, aviso). Es idempotente ante reintentos.
- `OnlinePaymentService.createSignupPreference` reutiliza la validación del pack y el armado de la preference del carrito.
- Web: `/comprar` muestra el pack y los datos y va directo a Mercado Pago. `/cuenta?alta=` espera la confirmación (`MemberSignupReturn`) y entra al portal.

## Decisiones

- Mismo patrón que el alta del gym (`PlatformSignup`): solicitud + webhook, sin estado «pendiente» en `members`.
- Si al aprobarse el pago el DNI ya fue tomado, la solicitud queda FAILED con el motivo, el pago sigue aprobado y lo resuelve el gym a mano.

## Validación

- `tsc --noEmit` y eslint de los archivos tocados en API y web, sin errores.
- `prisma validate` y `generate`. El build de la API compila y Nest resuelve el módulo raíz (members ↔ payment con `forwardRef`).
- Prueba manual pendiente: `local/en-testeo/alta-socio-con-pago.md`, casos G8–G11c de `docs/08`. La migración no se corrió en local.

## Referencias

- CU-AFI-007, RN-CTA-007, `06` §5, `09` §4.15h4.
- Commit: `5033cae` / https://github.com/LucianoMocchegiani/gym-bro/commit/5033cae
