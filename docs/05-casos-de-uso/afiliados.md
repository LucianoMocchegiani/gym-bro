# Casos de uso — Afiliados

**Estado:** Cerrado (v1)  
**Reglas:** RN-TEN-*, RN-ROL-*  
**Dominio:** Afiliado, CredentialOffer (pack OID4VCI)

---

## CU-AFI-001 Registrar afiliado

**Actor:** Staff con permiso de afiliados (Admin / rol custom)

**Precondiciones:**
- Staff autenticado en el tenant.
- Datos mínimos definidos por el gym (nombre, contacto, etc.).

**Flujo principal:**
1. Staff inicia alta de afiliado.
2. Completa datos personales y de contacto.
3. (Opcional) Asocia sucursal default.
4. Sistema valida unicidad razonable (ej. email/DNI según config).
5. Sistema crea Afiliado en estado activo (o pendiente si se define onboarding).
6. Sistema registra auditoría del alta.

La credencial de puerta **no** se emite en el alta: sale al cobrar un pack (CU-CON-001). Re-oferta: CU-AFI-006.

**Flujos alternativos / errores:**
- Datos inválidos o duplicados → mensaje y no crea.

**Postcondiciones:**
- Afiliado existe en el tenant.
- Evento de auditoría registrado.

**Reglas relacionadas:** RN-TEN-001, RN-ACC-002, RN-ROL-008

---

## CU-AFI-002 Editar ficha de afiliado

**Actor:** Staff con permiso

**Precondiciones:** Afiliado existente en el tenant.

**Flujo principal:**
1. Staff abre ficha.
2. Modifica campos permitidos.
3. Sistema guarda y audita cambios sensibles (contacto, documento).

**Errores:** Sin permiso → denegado.

**Postcondiciones:** Ficha actualizada.

**Reglas relacionadas:** RN-TEN-001, RN-ROL-007 (si el campo es sensible)

---

## CU-AFI-003 Dar de baja / suspender afiliado

**Actor:** Staff con flag peligroso de baja

**Precondiciones:** Afiliado activo.

**Flujo principal:**
1. Staff solicita baja o suspensión e indica motivo.
2. Sistema confirma.
3. Sistema marca afiliado inactivo/suspendido.
4. Ingresos futuros se deniegan por estado del afiliado (la VC en el celular no alcanza).
5. Contrataciones activas: se marcan según política (no auto-reembolso salvo flujo de devolución).
6. Auditoría.

**Errores:** Sin flag → denegado.

**Postcondiciones:** Ingresos futuros denegados por identidad/estado.

**Reglas relacionadas:** RN-ROL-007, RN-ROL-008, RN-ACC-002

---

## CU-AFI-004 Consultar estado de cuenta (staff)

**Actor:** Staff con permiso de lectura de afiliados

**Precondiciones:** Afiliado existente.

**Flujo principal:**
1. Staff abre “estado de cuenta”.
2. Sistema muestra contrataciones, créditos, deuda, pagos recientes, reservas próximas.
3. Si hay (o se quiere) débito automático: atajo a Caja `/dashboard/caja?memberId={id}&vista=debitos` — no se gestiona el mandato en la ficha (CU-PAG-010).

**Postcondiciones:** Solo lectura.

**Reglas relacionadas:** RN-TEN-008 (si el actor es profesor con alcance restringido)

---

## CU-AFI-005 Ver mi perfil y estado de cuenta (afiliado)

**Actor:** Afiliado

**Precondiciones:** Afiliado autenticado.

**Flujo principal:**
1. Afiliado abre perfil / cuenta / Inicio.
2. Sistema muestra **packs vigentes hoy** (contrataciones ACTIVE cuya vigencia incluye la fecha actual), agrupados por pack: créditos sumados, sin card si el saldo de sesiones es 0 y no hay acceso libre. Deuda y reservas próximas aparte.
3. Contrataciones de otros períodos (pasado / futuro apilado) no entran en esta vista; van a un **historial de compras** (backlog).

**Postcondiciones:** Solo datos propios.

**Reglas relacionadas:** RN-TEN-001  
**API:** `GET /me/account?coverage=current` (default member). Staff: `GET /members/:id/account` lista completa (`coverage=all` default).

---

## CU-AFI-006 Reemitir credencial de pack (OID4VCI)

**Actor:** Staff con `members.write`

**Precondiciones:** Afiliado activo; hay al menos un contrato ACTIVE cuya vigencia cubre **hoy**.

**Flujo principal:**
1. Staff en ficha elige el pack vigente (select; default = `startsAt` más reciente) y Emitir / Re-emitir (confirma: no cobra).
2. Sistema llama `POST /members/:id/credential-offers` (`force` por defecto; `packId` del select).
3. Kuatia genera un offer nuevo de **ese** pack. Soft-fail si el issuer falla (`FAILED` + `lastError`).
4. El socio acepta en App → Acceso → Credenciales.

**Errores:**
- Sin contrato vigente hoy (o sin vigente de ese `packId`) → 400, no se crea cobro ni contrato.
- Kuatia caído → offer `FAILED`; se puede reintentar el mismo botón.

**Postcondiciones:** Offer PENDING (o FAILED) de ese pack. Las ofertas de otros packs no se pisan. No hay transacción ni mes extra. El enum `STUB` no interviene.

**Reglas relacionadas:** RN-ACC-001, RN-ACC-002, RN-PAG-004
**API:** Staff `POST /api/members/:memberId/credential-offers` (`packId` opcional). Listado `GET …/credential-offers`. Socio: `GET /me/credential-offers` + accept/fail.

---

## CU-AFI-007 Hacerse socio y comprar desde la web del gym

**Actor:** Persona con (o sin) cuenta Faciliter

**Precondiciones:** El gym está activo, tiene packs publicados y Mercado Pago conectado (RN-CTA-008).

**Flujo principal:**
1. La persona entra a `{slug}.{dominio}` y ve los planes del gym.
2. Toca **Comprar** en un pack → `/comprar?pack={id}`.
3. Entra con su cuenta Faciliter (mail y contraseña o Google) o la crea.
4. Si no es socia del gym, ve el resumen del pack y completa nombre, DNI y teléfono (opcional). Sistema valida que el DNI y el mail estén libres y guarda una **solicitud de alta** (todavía no hay Afiliado).
5. **Pagar con Mercado Pago** → checkout del gym; la referencia del pago es la solicitud.
6. Al llegar el webhook **aprobado**, Sistema crea el Afiliado **ACTIVE** con el mail de la cuenta, audita `member.self_join`, crea el cobro del pack, lo confirma (contrato, caja, comprobante) y marca la solicitud COMPLETED (RN-CTA-007).
7. Mercado Pago vuelve a `/portal?alta={solicitud}`: la web espera la confirmación, emite el JWT de socio (`select-context`) y muestra el portal con el resultado del pago (CU-AFI-005).

**Portal del socio** (`/portal/*`, mismo alcance que la app): inicio con planes vigentes, créditos y próximas 3 reservas; **Clases** (calendario, CU-RES-001/003/004); **Mis clases** (reservas próximas, lista de espera y pasadas/canceladas); **Tienda** y **Carrito** (packs y drop-ins en un solo pago, CU-PAG-001); **Historial** (todos los comprobantes, con detalle y devolución, CU-PAG-004); **Documentos** (CU-FOL-003) y **Avisos** (bandeja y correo por tipo, CU-NOT-003/005). Sin sesión de socio → `/login?next=`. Datos, contraseña y cerrar sesión: **Mi cuenta** (`/cuenta`, avatar del header).

**Flujos alternativos / errores:**
- Ya era socia activa → salta el alta: el pack se suma al **carrito** del portal y va a `/portal/carrito`; al pagar, MP vuelve a `/portal?compra={transactionId}`.
- Socia suspendida o dada de baja → 403, no puede comprar online.
- DNI o mail ya usados por otro socio del gym → 409 antes de cobrar.
- Pago rechazado, cancelado o abandonado → no se crea el Afiliado; la solicitud queda pendiente y se reutiliza si vuelve a intentar.
- Pago pendiente → la web espera; el alta se completa cuando el webhook llega aprobado.
- Pago aprobado pero el DNI fue tomado en el medio → la solicitud queda FAILED con el motivo, el pago sigue aprobado y la web le pide escribir al gym; el gym lo resuelve a mano.
- Gym sin Mercado Pago → no hay botón Comprar; «se contrata en el gym».

**Postcondiciones:** Afiliado nuevo solo si el pago se aprobó, con su pack activo y comprobante.

**Reglas relacionadas:** RN-CTA-006, RN-CTA-007, RN-CTA-008, RN-PAG-009
**API:** `GET /public/tenants/by-slug/:slug/packs` (público) · `POST /identity/member-signups` y `GET /identity/member-signups/:id` (JWT Identity) · `POST /auth/select-context` · socio: `POST /me/transaction-items/mp/cart` con `returnToWeb: true` · `GET /me/account` · `GET /me/packs` · `GET /me/mp-status` · `GET /me/sessions` · `GET|POST /me/reservations` · `PATCH /me/reservations/:id/status` · `GET|POST /me/waitlist` · `PATCH /me/waitlist/:id/status` · `GET /me/receipts` · `GET /me/refund-requests` · `POST /me/transaction-items/:id/refund-requests`.

---

[Índice](../00-indice.md) · [Siguiente: Servicios, sesiones y packs →](./servicios-sesiones-packs.md)
