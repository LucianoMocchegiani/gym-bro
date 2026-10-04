# Faciliter — Arquitectura

**Estado:** Cerrado (v1) — arquitectura conceptual + stack MVP  
**Fuentes:** [01-documento-maestro.md](./01-documento-maestro.md), [03-modelo-dominio.md](./03-modelo-dominio.md), [05-casos-de-uso/](./05-casos-de-uso/)

---

## 0. Stack elegido (MVP)


| Capa              | Tecnología                              | Notas                                                                          |
| ----------------- | --------------------------------------- | ------------------------------------------------------------------------------ |
| **API / backend** | **NestJS 11 + TypeScript 5.9**          | Monolito modular; runtime **Node 24** (Active LTS)                             |
| **Web**           | **Next.js 16 (App Router) + React 19**  | Landing (apex) + Admin / Super en `web/`                                       |
| **App móvil**     | **Flutter**                             | Afiliado y staff (mismo binario); acceso QR / wallet SSI                       |
| **Base de datos** | **PostgreSQL 16**                       | Multi-tenant por `tenant_id`                                                   |
| **ORM**           | **Prisma 6** (`api/prisma/`)            | `migrate deploy` al arrancar la API; seed demo a mano. Prisma 7 diferido (ESM) |
| **Auth API**      | JWT + refresh (propio) en MVP           | Clerk/Auth0 opcional después                                                   |
| **Jobs**          | BullMQ + Redis (cuando haga falta)      | Vencimientos, mails, recurrencias                                              |
| **Email N1**      | MailPort: stub o Resend (`MAIL_DRIVER`) | Push N2 post-MVP                                                               |
| **Storage**       | Object storage S3-compatible            | Fotos de progreso                                                              |
| **Pagos**         | Mercado Pago (cuenta del gym)           |                                                                                |
| **Acceso**        | Adapter SSI / Quark                     | Intercambiable                                                                 |


Estructura de repo sugerida:

```text
api/            # NestJS (+ prisma/)
web/            # Next.js (Admin / Super Admin)
chat-api/       # Hono + Prisma (asistente; DB `chat`; post-MVP)
mcp/            # Sidecar MCP GymBro (tools → REST Nest; post-MVP)
mobile/         # Flutter
docker-compose.yml
docs/           # C-producto (ya existe)
```

---



## 1. Objetivos técnicos

1. Multi-tenant con aislamiento estricto de datos (RN-TEN-001).
2. Core de negocio independiente del proveedor de acceso (adapter SSI).
3. Cobros con idempotencia y confirmación de derechos solo tras pago aprobado.
4. Modularidad: módulos post-MVP (tienda, white label, push) enchufables.
5. Un solo desarrollador: simplicidad operativa > microservicios prematuros.

---



## 2. Vista de contexto (C4 L1)

```text
┌─────────────┐     ┌───────────────┐     ┌──────────────────┐
│ App móvil   │     │ Web Admin     │     │    Web Admin     │
│ (afiliado + │     │(staff tennant)│     │   (Faciliter)    │
│  staff luz) │     │               │     │                  │
└──────┬──────┘     └──────┬────────┘     └────────┬─────────┘
       │                   │                       │
       └────────────┬──────┴───────────────────────┘
                    ▼
            ┌───────────────┐
            │  API Faciliter│
            │  (backend)    │
            └───────┬───────┘
                    │
     ┌──────────────┼──────────────┬─────────────────┐
     ▼              ▼              ▼                 ▼
┌─────────┐  ┌───────────┐  ┌────────────┐  ┌────────────────┐
│  DB     │  │ Mercado   │  │ Access     │  │ Email (N1)     │
│ tenant  │  │ Pago      │  │ Adapter    │  │ proveedor SMTP │
│ scoped  │  │ (x gym)   │  │ → Kuatia   │  │ / ESP          │
└─────────┘  └───────────┘  └────────────┘  └────────────────┘
```

---



## 3. Estilo de despliegue recomendado (MVP)


| Opción                             | Cuándo                                                       |
| ---------------------------------- | ------------------------------------------------------------ |
| **Modular monolith** (recomendado) | Un deploy, módulos por carpetas/bounded contexts             |
| Microservicios                     | Post-MVP solo si un módulo lo exige (ej. acceso de alto QPS) |


Estructura lógica interna:

```text
api/                    # NestJS (módulos por dominio dentro de src/)
web/                    # Next.js — landing (apex) + web del gym (slug.localhost/) + Admin (/dashboard)
mobile/                 # Flutter
# Dominios Nest (api/src):
#   auth, tenants, members, staff, roles, services, packs, sessions,
#   reservations, waitlist, contracts, mercadopago, cash-register,
#   refunds, receipts, access, quark, audit, reports, tenant-settings, …
```

CORS: la API acepta orígenes de `CORS_ORIGIN` (default `http://localhost:3002`) para el panel web.

---



## 4. Multi-tenant



### 4.1 Modelo

- **Tenant = Gimnasio** (row-level isolation con `tenant_id` en todas las tablas de negocio). La plataforma Faciliter es el tenant `admin`: staff con `tenantId` como cualquier gym, más permisos `platform.*`.
- Operar otro gym: impersonación (§5), no un perfil JWT sin tenant.
- Staff/afiliado: `tenantId` del **JWT** (`TenantGuard` + `@CurrentTenant()` / `@RequireTenantAuth()`). Nunca confiar en body (RN-TEN-001).
- Tenant **suspendido**: se corta en **login/refresh**; el access JWT puede vivir hasta su TTL (~15 min).



### 4.2 Sucursales (S2)

- Tabla `branches` (modelo Prisma `Branch`) desde día 1.
- MVP UI: una sucursal activa/default; APIs ya pueden exponer `defaultBranch` en respuestas de plataforma (`POST/GET /api/tenants`).
- Al crear tenant: seed automático `Sede principal` (`is_default = true`). Sin CRUD multi-sede en esta etapa.



### 4.3 Plan SaaS GymBro

- Campo `plan` en tenant (hoy un valor).
- Feature flags / módulos habilitados por tenant para cuando existan más planes.

---



## 5. Autenticación y autorización

```text
Login por perfil o cuenta → access JWT + refresh (Postgres)
      → claims: sub, profileType (STAFF|MEMBER|IDENTITY), tenantId?, email
      → JwtAuthGuard
      → (E1) permisos unión de roles + flags (CU-ROL-006)
```


| Perfil | Notas | Endpoint login |
|--------|-------|----------------|
| Staff | `tenantId` obligatorio. Plataforma = slug `admin` (rol `super-admin`, `platform.*`). RN-ROL-001 | `POST /api/auth/staff/login` (`tenantSlug`) o identity + `POST /auth/select-context` |
| Identity | Persona; **sin** `tenantId` | `POST /api/auth/identity/login` o `POST /api/auth/google` |
| Afiliado | Perfil separado (RN-ROL-005) | `POST /api/auth/member/login` o identity + select-context |


Identity: `GET /api/auth/memberships` + `POST /api/auth/select-context`. Alta web: `POST /api/auth/identity/register`, `POST /api/identity/signups` (preapproval en MP de `admin`; gym nace en webhook). Apex: `/login` sin sesión (carga hasta cookie/JWT); `/cuenta` autenticado = mismo `AccountPanel` que el gym + Mis tenants + plan. Google app: `POST /api/auth/google`. Google web: proxy `login.faciliter.xyz` → `POST /api/auth/from-cookie`.

También: `POST /api/auth/refresh`, `POST /api/auth/logout`, `GET /api/auth/me` (incluye `tenantId` y `platformAccess` `ok`|`limited` para recorte de plan Faciliter), `POST /api/auth/change-password` (JWT STAFF o IDENTITY; verifica la actual con bcrypt y revoca refresh → re-login).

**Web del gym** (`{slug}.{dominio}`, RN-CTA-005/006): `/` vidriera pública (SSR, `GET /public/tenants/by-slug/:slug/packs`, indexable), `/comprar?pack=` (CU-AFI-007), `/portal` portal del socio (inicio + `/portal/clases`, `/portal/mis-clases`, `/portal/tienda`, `/portal/carrito`, `/portal/historial`; RN-CTA-009), `/cuenta` cuenta de quien entró (`GymAccountPage`: `AccountPanel` con datos, contraseña y cerrar sesión, más accesos al portal y al panel; las vueltas viejas `/cuenta?compra|alta=` se reenvían a `/portal`), `/login` único y el panel staff en `/dashboard/...`. El header del gym, el apex y el panel usan el mismo avatar (`AccountAvatarLink`) hacia la cuenta. `app/portal/layout.tsx` pone el shell del gym; las secciones comparten el route group `app/portal/(area)` (`MemberArea`: exige sesión de socio, menú y contexto); el cliente HTTP del socio está en `web/lib/api/member-portal.ts` (`/me/*`, `auth: 'member'`), las reservas/espera/créditos en el hook `useMemberBooking` (como `SessionBookingMixin` de la app) y el carrito en `web/lib/member-cart.ts` (`gymbro.member.cart` en localStorage con dueño `tenantId:memberId`, sobre la misma factory `createLocalStore` que las sesiones). Un socio que entra a `/comprar` suma el pack al carrito. El middleware redirige con 308 las rutas viejas del panel (`/caja` → `/dashboard/caja`, también OAuth MP `/config?mp=`) y la raíz de `admin` al apex; solo `/` del gym (y el marketing del apex) se indexa. El login usa la cuenta Faciliter (mail/contraseña o Google vía `from-cookie` sin slug) → `GET /auth/memberships` filtrado por el slug → `POST /auth/select-context` STAFF o MEMBER. Sesiones en `localStorage` por origen con una factory común (`web/lib/auth/token-store.ts`, sobre `web/lib/local-store.ts`): `gymbro.staff.session`, `gymbro.member.session`, `gymbro.identity.session`; `apiRequest({ auth: 'staff' | 'member' | 'identity' })`. Logout en el gym cierra las tres y vacía el carrito. Alta self-service con pago previo (mismo patrón que `PlatformSignup`): `POST /api/identity/member-signups` (JWT Identity; pack, nombre, DNI, teléfono) valida DNI/mail, guarda `member_signups` y crea la preference MP del gym con `externalReference` = solicitud y vuelta a `/portal?alta=`. El webhook aprobado (`payment` o `merchant_order`) llama a `MemberSignupService.fulfillPaid`: crea el Member ACTIVE (`member.self_join`) y el cart del pack, y lo confirma por `applyRemoteStatusCart` como cualquier cart MP. Sin pago no hay Member. La web consulta `GET /api/identity/member-signups/:id` hasta COMPLETED y entonces hace `select-context` MEMBER.

Rutas de negocio del gym: `@RequireTenantAuth()` = JWT + `TenantGuard` + `PlatformAccessGuard` (RN-PAG-018). Staff limitado: 403 salvo `@AllowWhenLimited()` (`GET /plan`, `GET /me/permissions`). Impersonación y MEMBER no se recortan.
Rutas de plataforma: tenant `admin` + `platform.*`. Operar un gym: `POST /api/auth/super/impersonate` setea cookie `impersonation_handoff` (un uso, ~60 s, `SameSite=None; Secure`, `Domain` = `COOKIE_PARENT_DOMAIN` o `.` + `CORS_APP_DOMAIN`) y **no** devuelve JWT; el browser va a `{slug}/login?handoff=1` y canjea con `POST /api/auth/from-handoff` (JWT Staff 4h, borra cookie). Store en memoria (`ImpersonationHandoffStore`), como el proxy Google (`central_session`); restart de API mata handoffs pendientes. Sin tabla Prisma. QA web en HTTPS: `http://*.localhost` no comparte esa cookie. Volver: `/dashboard/cuenta` → logout del gym; la sesión de plataforma sigue en el origen `admin`. No hay espejos nested de negocio.
Autorización fina staff: `@RequirePermission('code')` (unión de roles; permisos `dangerous` = flags RN-ROL-007).

Afiliado y staff **nunca** comparten el mismo perfil de sesión (RN-ROL-005).

Pruebas manuales: colección Postman en `[postman/](../postman/)`.

---



## 6. Adapter de acceso (OID4VP)



### 6.1 Flujo OID4VP (implementado)

```text
Staff POST /access/oid4vp/request
  → Quark verifier crea authorization request (DCQL `faciliter_access`: vcts pack+staff, tenantId)
  → QR = requestUri
App afiliado escanea → OID4VP share
Staff GET /access/oid4vp/session/:id (poll)
  → Quark session cruda; si hay vp_token → decode SD-JWT (Postman 02.7) → memberId
  → evaluateAndPersist → access_attempts
```

Identidad = claim `memberId` de la VC de pack (`urn:faciliter:pack:{id}`). Sin stub de vínculo ni `stub-venue`. Claims se mapean en GymBro (no en Quark).

### 6.2 Stubs retirados

- Eliminados: `ACCESS_PROVIDER=stub`, `AccessIdentityProvider` stub, `POST /access/verify`, `POST /me/access/check-in`, endpoints `access-credentials`.
- Tabla `access_credentials` queda legada (sin API).



### 6.2b Kuatia (OID4VCI + OID4VP)

Diseño: [12-acceso-quark-oid4-diseno.md](./12-acceso-quark-oid4-diseno.md). Docs API: [kuatia.xyz/docs](https://kuatia.xyz/docs).

**Modelo:** 1 producto Kuatia “GymBro” → **1 issuer + 1 verifier** compartidos. Gyms se distinguen por claims (`tenantId`, `packId`), no por wallets.

**Implementado (corte adapter):**

- Compose **sin** `quark-issuer` / `quark-verifier`; bases y keys en `KUATIA_`* (`api/.env`).
- Auth admin: header `x-api-key` (`iss_live_…` / `ver_live_…`) en `HttpQuarkAdminAdapter`.
- Al `POST /api/tenants`: solo DB GymBro + **bind** de wallet IDs compartidos (`READY` / `MISSING` si falta env). No crea issuer/verifier.
- Reintento Super: `POST /api/tenants/:id/quark/provision` (mismo bind).
- Create/update pack → `PATCH …/records/metadata` del issuer compartido (`pack_{id}` / `urn:faciliter:pack:{id}`; soft-fail en `packs.quark_*`).
- Offer / VP: mismos flujos, contra IDs fijos de env.
- Columnas/módulo `quark_*` se mantienen por compatibilidad de schema/API.



### 6.3 Evaluación de ingreso (dominio puro)

```text
memberId (desde VC OID4VP, pase manual o GET access-preview)
  → load Afiliado + Contrataciones + Reservas + Config
  → decide Allow/Deny + reasonCode
  → [puerta] persist IntentoIngreso (access_attempts)
  → [puerta] maybe mark asistencia sesión (reservations.checked_in_at)
  → [preview] devolver decisión; no persistir
```

Implementado: `POST /access/oid4vp/request` + `GET /access/oid4vp/session/:id` (Staff), `GET /members/:id/access-preview` (misma decisión, sin persistir) y pase manual. Deuda = días calendario (BA) desde `endsAt` del último contrato libre; tolerancia vía `debtToleranceDays` (`ok_deuda_tolerancia` / `deuda_excedida`).

### 6.4 Modos de escaneo

- Gym Kuatia: **modo B** (afiliado escanea QR de puerta = `requestUri` OID4VP). Admin: `/dashboard/puerta`. App: hub Acceso → Escanear.
- Gym ZKTeco: `member_at_device` (la persona se identifica en el aparato). `/dashboard/puerta` muestra "Este gym usa acceso ZKTeco" + últimos ingresos.

### 6.5 Contrato de sistemas de puerta (RN-ACC-010)

Un gym elige su sistema en `tenant_settings.access_provider` (`KUATIA` default | `ZKTECO`). Las reglas no dependen del sistema:

```text
Kuatia OID4VP ─┐                       ┌─ persist access_attempts (+ channel)
ZKTeco evento ─┼─► AccessSubject ──► AccessVerifyService.evaluateSubject ─┤
Pase manual ───┘   (socio | staff)     └─ si allow y ZKTeco → DoorActuatorPort.open
```

| Pieza | Dónde | Rol |
|-------|-------|-----|
| Entrada genérica | `access/access-verify.service.ts` `evaluateSubject(subject, origin)` | `origin` = tenant, `channel`, `scanMode`, `credentialRef`, actor. Socio → `evaluateAndPersist`; staff → regla staff |
| Adapter Kuatia | `access/access-oid4vp.service.ts` | VP → `AccessSubject`; 409 si el gym no es Kuatia |
| Adapter ZKTeco | `access/access-zkteco.service.ts` + `POST /access/zkteco/events` | Número → vínculo (`access_identity_links`) o DNI → `AccessSubject`; idempotente por `credential_ref` |
| Puerto emisión | `access-providers/credential-issuer.port.ts` → `TenantCredentialIssuer` | Packs/contratos emiten por acá: Kuatia sincroniza/emite; ZKTeco no-op. Offers manuales socio/staff → 409 en ZKTeco |
| Puerto apertura | `access-providers/door-actuator.port.ts` → `LogDoorActuatorAdapter` | Hoy solo registra "Abrir puerta (simulado)". Relé/agente real: [19-puerta-molinete-hw-sw.md](./19-puerta-molinete-hw-sw.md) |

El puente ZKTeco se autentica como staff (`access.verify`) en este corte; token de dispositivo y SDK/bridge del aparato quedan fuera de `api/`.

---



## 7. Pagos (Mercado Pago + caja)



### 7.1 Principios

- Credenciales MP **por tenant** (`mercadopago_accounts`; access y refresh token cifrados; permiso `mp.connect`). Alta normal por OAuth («Conectar Mercado Pago»); token pegado como respaldo avanzado.
- Derechos (contratación/reserva) solo tras `aprobado` (RN-PAG-004).
- Toda intención de cobro: `idempotency_key` única de negocio (RN-PAG-005).



### 7.1b Cuenta MP (CU-PAG-006)

```text
Forma normal (OAuth, app de plataforma Faciliter):
Admin POST /mercadopago/account/oauth/start
  → state aleatorio + PKCE (code_verifier cifrado) en mp_oauth_states (10 min, 1 uso)
  → { authorizationUrl } → navegador a auth.mercadopago.com (gym autoriza)
MP → GET /mercadopago/oauth/callback?code&state   (público, sin JWT)
  → consume state → POST api.mercadopago.com/oauth/token (code + code_verifier)
  → cifra access + refresh token → upsert mercadopago_accounts (OAUTH, expira 180 d)
  → audita mp.account.connect → 302 a {slug}.<PUBLIC_WEB_BASE_URL>/dashboard/config?mp=connected|error
Job diario 04:00 BA: refresh_token (rota) si vence en < 30 d; falla → last_refresh_error → «Reconectar»

Conexión manual (avanzado):
Admin PUT /mercadopago/account { accessToken, publicKey }
  → (opcional) MpAccountPort.validateAccessToken → /users/me
  → cifra token → upsert mercadopago_accounts (MANUAL)

GET status sin secretos (connectionMode, needsReconnect, oauthAvailable); POST test; DELETE desconecta
```

Avisos de pago con OAuth: llegan por la `notification_url` (con `tenantId`) de cada Preference y preapproval. La app de plataforma de OAuth **no** lleva webhook de panel.

Checkout/webhook implementados (stub local + modo live). Pendiente en roadmap: validación E2E con cuenta MP real.

### 7.2 Flujo MP

```text
Member POST /me/transaction-items/mp/cart { items[], idempotencyKey, returnToWeb? }
Staff POST /members/:id/transaction-items/mp/cart   (mismo body; members.write)
  → Transaction PENDING + Preference (cuenta del gym; 1 link con el total)
  → Webhook POST /webhooks/payment?tenantId=… (o /simulate en stub)
  → aprueba → contrato/reserva por cada ítem + 1 recibo por Transaction
  → rechaza → REJECTED (sin derechos)
```

Env: `MP_CHECKOUT_MODE=stub|live`, `PUBLIC_API_BASE_URL` (notification_url).

`returnToWeb: true` (web del gym): la Preference lleva `back_urls` armadas en el servidor hacia `{slug}.<PUBLIC_WEB_BASE_URL>/portal?compra={transactionId}` (`auto_return=approved` solo con https). La app no lo manda. Las URLs web del tenant salen de `api/src/common/web-urls.ts` (también el retorno del OAuth MP y del débito).

Ítems de la Preference (`title` / `description`): mismo criterio que el comprobante interno (pack = nombre + servicios/créditos; drop-in = servicio · sede · horario). El modal de MP lista sobre todo `title`.

### 7.3 Caja

- `MovimientoCaja` ligado a `Pago`.
- `ArqueoCaja` por fecha (+ sucursal cuando multi-sede UI).
- Admin: `/dashboard/arqueo` = **Cierre**; `/dashboard/devoluciones` = **Solicitudes de devolución** (`refund_requests`). Grilla: `kind` (ingreso/egreso) + `category` (`SALE` / `REFUND`) **derivada de** `kind` en `buildLedgerRows`. El arqueo cuenta solo efectivo: `expected` = INCOME CASH − OUTCOME CASH − gastos CASH.
- Gastos: módulo `expenses` (`/dashboard/gastos`), tablas propias (no `cash_movements`). Comprobantes en R2 privado vía `FileStoragePort`. `GET /expenses/summary` alimenta Reportes (resultado = ingresos − devoluciones − gastos). RN-GAS.



### 7.4 Devoluciones

```text
Member POST /me/transaction-items/:id/refund-requests → política RN-PAG-012
  → PENDING | rechazo (motivo)
Staff POST /transactions/:id/refunds (transaction_items.refund)
  → ítems REFUNDED + revierte contrato/reserva de cada uno
  → 1 refund MP (suma / saldo) o manual_pending | CASH/STUB: OUTCOME REFUND
  → 1 comprobante concept=REFUND por ejecución
  → POST /transaction-items/:id/refunds = wrapper de un ítem
  → motiveCode=doble_cobro (CU-PAG-007)
```



### 7.5 Débito automático MONTHLY

Suscripción Mercado Pago (`preapproval` sin plan asociado, `pending`) en la cuenta del gym. Con plan, MP exige `card_token_id` y `authorized`; sin plan devuelve `init_point` y el socio carga el medio en MP. GymBro no guarda tarjeta ni corre un cron de cobro. El contrato sigue al cobro approved de MP.

**Código (2026-09-15):** aún Customer+Card+Payments+job. Este § es el **diseño a implementar**.

```text
Alta cobro (CU-PAG-008):
  Caja carrito = 1 MONTHLY + MP + tilde débito
  → POST /preapproval pending, sin plan, monto = precio catálogo → init_point (copiar/abrir)
  → mandato PENDIENTE_CHECKOUT
  → socio paga en MP
  → webhook subscription_preapproval + authorized_payment/payment
  → GET recurso → APPROVED → Transaction PACK → contrato; mandato ACTIVE

Alta sin cobro:
  Débitos “Generar link” { start_date = endsAt del MONTHLY vigente }

Cobro recurrente (CU-PAG-009):
  lo dispara MP; webhook → mismo pipeline que Caja
  reintentos = MP; sin POST .../charge; sin DebitJobService

Caja /caja?memberId=&vista=debitos (CU-PAG-010)
  baja = PUT preapproval cancelled
  cambio pack = cancel A + alta B
  devolver cobro que inscribió → cancelByEnrolledItems + cancel MP
```



## 8. Módulo catálogo / reservas

- Generación de sesiones por `ReglaRecurrencia` (job o al guardar regla con horizonte).
- Reserva: máquina de estados simple; confirmación atada a billing.
- Lista de espera: strategy pattern por `modoListaEspera` (auto / afiliado / staff).

---



## 9. Notificaciones

```text
DomainEvent → NotificationDispatcher
  → check gym event enabled
  → check user preference
  → write InApp
  → send Email (N1)
```

Plantillas versionadas por tenant + código evento.  
Canales futuros (WhatsApp/Push) = nuevos `ChannelSender` sin tocar el dispatcher.

---



## 10. Rutinas

- Blob/snapshot JSON o tablas de días/ítems al asignar (copia).
- Media de fotos: storage de objetos con URL firmada; metadatos en DB.
- Independiente de sesiones (sin FK obligatoria a Sesion).

---



## 11. Auditoría

- Append-only `audit_events` (`EventoAuditoria`).
- Emisión desde servicios: create/update tenant, create/update roles, assign staff roles (RN-ROL-008).
- Lectura: Staff `GET /api/audit-events` (`audit.read`). Super no tiene nested: impersoná y usá la misma ruta.
- Acciones futuras (pase manual, devoluciones, baja afiliado) reutilizan `AuditService.record`.

---

## 11b. Migración de afiliados (importación)

Admin → Afiliados → Importar. Reglas: RN-MIG ([04](./04-reglas-de-negocio.md) §6c). Tabla `member_imports` ([09](./09-esquema-db.md) §4.9d).

### Cómo corre

```text
Navegador (parsea xlsx/csv/zip/carpeta)
  ├─ Planilla: lotes de 200 filas, secuenciales ── POST /member-imports/:id/rows
  │     API por lote: consultas de clasificación (masivas)
  │                   → 1 transacción por fila nueva (en serie)
  │                   → 1 update de contadores
  ├─ Fotos/carpeta: 1 request por archivo, 3 en paralelo
  │     foto:    R2 upload → UPDATE member (solo si imageUrl null) → si perdió, delete R2
  │     carpeta: cupo → R2 upload → INSERT folder_item → si falla, delete R2
  │     + 1 update de contadores por archivo
  └─ Números ZKTeco (solo gym ZKTeco, RN-MIG-006): lotes de 200 ── POST /member-imports/:id/access-codes
        API por lote: socios por DNI/mail + vínculos existentes (masivas)
                      → 1 INSERT access_identity_links por fila nueva (único → error si otro lo ganó)
                      → 1 update de contadores
```

- **Sin job en servidor:** la pestaña tiene que quedar abierta. Cortes → Reintentar el lote o re-subir (idempotente: existentes se omiten).
- **El parseo no toca la API:** el navegador lee Excel/CSV (`read-excel-file`, `papaparse`) y zip (`fflate`) o la carpeta (`webkitdirectory`). La API solo recibe JSON chico y archivos de a uno.
- **Transacción por fila, no por lote:** una fila mala (p. ej. P2002 por carrera) no tumba las otras 199.
- **R2 y Postgres no comparten transacción:** el orden es R2 primero y DB después, con borrado de R2 si la DB falla. Peor caso: un objeto huérfano en R2 si la API muere entre los dos pasos; nunca un registro apuntando a un archivo inexistente.

### Carga sobre la API (por qué no bloquea)

| Recurso | Uso por persona importando |
|---------|----------------------------|
| Event loop | Todo I/O async (Prisma, R2). CPU por lote: normalizar 200 filas + sets (ms) |
| Hash de contraseña | `ChangeMe123!` se hashea **una vez por proceso** (memo) y se reutiliza; `bcryptjs` es JS puro, por eso no se hashea por fila |
| Pool de Postgres | Planilla: 1 conexión a la vez (transacciones en serie, ms cada una). Archivos: hasta 3 requests simultáneos |
| Lock | Los 3 requests de archivos actualizan la misma fila de `member_imports` (contadores): esperas de ms, sin deadlock (una sola fila) |
| Memoria | Multer en memoria: hasta 5 MB por archivo × 3 en paralelo ≈ 15 MB, se libera al terminar cada uno |
| Body JSON | Límite Express 100 kB → por eso 200 filas por lote |
| Rate limit | No hay throttler en la API hoy; si se agrega, contemplar ráfagas de cientos de requests de archivos |

Dimensionado para cientos o pocos miles de socios por gym.

### Qué vigilar si crece

1. **DNI contra todo el gym en cada lote.** Para comparar DNI aunque vengan con puntos/guiones, cada lote (`loadExisting`) y cada `match` del zip traen **todos** los `members.document` del tenant y normalizan en memoria. Irrelevante con 1–5k socios; con decenas de miles son consultas pesadas repetidas. Solución: columna `document_normalized` con índice `(tenant_id, document_normalized)` y buscar con `in`.
2. **Altas fila por fila.** 10.000 filas ≈ 10.000 transacciones cortas: funciona, pero tarda minutos con la pestaña abierta. Para ese tamaño: `createMany` por lote (resolviendo identidades antes) o cola/worker en servidor con progreso por polling.
3. **Cupo de carpeta con concurrencia.** `assertItemQuota` es count + insert (no atómico). La web planifica el cupo y no manda más de 10 por socio, pero un cliente directo a la API con muchos requests en paralelo al mismo socio podría pasarse por 1–2. Si importa: lock por socio o constraint.
4. **Objetos huérfanos en R2.** Raro (caída entre upload y DB). Si aparecen: job de limpieza que compare prefijos `folder/{tenant}/…` y `tenants/{tenant}/members/…` contra la DB.
5. **Throttler futuro.** Si se agrega rate limit global, excluir o subir el tope de `/member-imports/*` para el staff, o la subida de archivos se va a cortar.

---



## 12. APIs (contrato conceptual)

Prefijo sugerido: `/api/v1`.


| Área                             | Endpoints / CU relacionados                                                                                                                                                                                                                       |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth                             | `POST /auth/login`, refresh                                                                                                                                                                                                                       |
| Plataforma | Staff del tenant `admin` + `platform.*`. CRUD `/tenants`, `GET /tenants/:id/staff`, `POST /auth/super/impersonate` (nombre histórico) + `POST /auth/from-handoff`, `POST /tenants/:id/quark/provision`. Operar el gym = impersonar (rutas Staff). |
| Afiliados                        | CRUD `/members` (Staff JWT)                                                                                                                                                                                                                       |
| Catálogo                         | `/services`, `/packs`, `/sessions`; landing `GET /public/platform/packs`; web del gym `GET /public/tenants/by-slug/:slug/packs` (`onlineCheckout` = MP conectado)                                                                                 |
| Web del gym                      | `POST /identity/member-signups` + `GET /identity/member-signups/:id` (JWT Identity, alta con pago previo CU-AFI-007); socio existente: `select-context` MEMBER y cart MP con `returnToWeb`                                                       |
| Reservas                         | `/sessions/:id/reservations`, waitlist                                                                                                                                                                                                            |
| Billing                          | cart MP `/me                                                                                                                                                                                                                                      |
| Access                           | `/access/oid4vp/request`, `/access/oid4vp/session/:id`, `/access-attempts`, `GET /members/:id/access-preview`, manual-pass                                                                                                                        |
| Chat (servicio `chat-api` :3010) | `GET /health`; `POST /v1/public/session` (landing); `GET/POST /v1/conversations`; `GET/PATCH/DELETE /v1/conversations/:id`; `GET/POST /v1/conversations/:id/messages` (POST = UI Message Stream; OpenRouter + MCP); `POST /v1/conversations/:id/user-actions` (botón → tool MCP `chat/userOnly`)                                |
| MCP (servicio `mcp` :3011)       | `GET /health`; `POST /mcp` Streamable HTTP + Bearer. Tools A–D (lectura): operación, reportes/débitos/devoluciones, catálogo/roles/audit slim, `get_help` (`producto`, `guia` + temas). C8: `propose_*` + `confirm_proposal` (crear/editar con confirmación, RN-ASI)                                                            |
| Carpeta                          | `/folder-labels`, `/members/:id/folder`, `/staff/:id/folder`, `/me/folder`                                                                                                                                                                        |
| Migración afiliados              | Staff `members.import` + `members.write`: `/member-imports` (list, preview, match, start, `:id/rows`, `:id/members/:memberId/photo` y `/folder`, `access-codes/preview`, `:id/access-codes`, `:id/finish`). Auth: `GET /auth/password`, `POST /auth/set-password`. Ver §11b                     |
| Notif N1                         | Member `GET /me/notifications` (solo socio). Staff plantillas `/notification-templates`. Avisos de plan Faciliter: mail al Identity dueño, no GET staff.                                                                                          |
| Afiliados                        | Staff CRUD members + PATCH status (`members.deactivate`); estado de cuenta `GET /members/:id/account` / `GET /me/account?coverage=current                                                                                                         |
| Sesiones                         | Staff `GET                                                                                                                                                                                                                                        |
| Reservas                         | Member `/me/reservations` (crédito) + cancel; Staff `POST /members/:id/reservations` (CREDIT) + `GET /sessions/:id/reservations` + `PATCH /reservations/:id/status` (`reservations.write`)                                                        |
| Waitlist                         | Member `/me/waitlist`; Staff `POST /members/:id/waitlist`, `GET /sessions/:id/waitlist` (`reservations.write`; query `status` / `allStatuses`); promoción AUTO al liberar cupo                                                                    |
| Settings                         | Staff `GET                                                                                                                                                                                                                                        |
| Caja                             | Staff `GET /payment-register/day`, `POST /payment-register/day/reconcile` (`cashier.operate`); ingresos = cart; egresos = una ejecución de devolución                                                                                             |
| Mercado Pago                     | Staff `GET                                                                                                                                                                                                                                        |
| Devoluciones                     | Member `POST /me/transaction-items/:id/refund-requests`, `GET /me/refund-requests`; Staff `GET /refund-requests`, `POST /transactions/:id/refunds` (lote) y `POST /transaction-items/:id/refunds` (wrapper) (`transaction_items.refund`)          |
| Comprobantes                     | Member `/me/receipts`; Staff `GET /receipts/:id`, `GET /transactions/:id/receipt` (`members.read`); `lines[]` (pack → contrato/vigencia + `services[]`; drop-in → reserva/horario)                                                                |
| Catálogo                         | Staff CRUD services + packs (`catalog.write`; kind inferido; `creditsExpireAt`; `imageUrl`). Member `GET /me/packs` (`imageUrl`) y `GET /me/sessions` (`serviceImageUrl`)                                                                         |
| Contrataciones                   | Alta de pack: Caja o MP; `POST /members/:id/contracts` con STUB → 400; re-oferta `POST /members/:id/credential-offers` (`packId` opcional); `PATCH /contracts/:id/status` → `CANCELLED` (pierde derechos, RN-SER-009); Member `GET /me/contracts` |
| Roles                            | Staff list-get-create-patch roles; `PUT /staff/:id/roles`; `GET /me/permissions` (UI nav). Super: `GET /tenants/:id/staff` + impersonate                                                                                                          |
| Auditoría                        | Staff `/dashboard/auditoria` → `GET /audit-events` (`audit.read`); Super impersona; escritura en mutaciones                                                                                                                                                 |
| Reportes                         | Staff `GET /reports/summary?from&to` (`reports.read`); ingresos $ + devoluciones + snapshot; `transactions[]` misma fila que caja                                                                                                                 |
| Vencimientos                     | Staff `GET /expirations?view&pay` (`members.read`); cola MONTHLY por vencer (7 días) o en tolerancia; no es reporte                                                                                                                               |
| Caja                             | `/cash/day`, `/cash/close`                                                                                                                                                                                                                        |




Todas las rutas de tenant validan membership/permiso + `tenant_id` del token.

---



## 13. Datos y consistencia


| Tema          | Enfoque MVP                                                                                                                                                                                                                                            |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Transacciones | DB transacciones al confirmar pago → derechos                                                                                                                                                                                                          |
| Webhooks      | Inbox de eventos MP con dedup por id MP + idempotencyKey                                                                                                                                                                                               |
| Jobs          | Cron Nest 12:00 ART: avisos pack por vencer / tolerancia (E2/E3). Recurrencias de sesiones aparte.                                                                                                                                                     |
| Archivos      | R2: fotos `tenants/{tenantId}/…` (`POST /upload` URL pública). Al quitar o reemplazar foto de ficha/staff/servicio/pack (y al borrar físico) se llama `delete` del objeto viejo. Carpeta `folder/{tenantId}/…` + GET JWT (delete de FILE ya borra R2). |
| Notif N1      | Dispatcher + `MailPort`. Socio: in-app + mail. Dueño gym: mail + fila `identity_id` (plan Faciliter). Plantillas gym `/dashboard/avisos` solo eventos socio. Push y cola: post-MVP.                                                                              |


---



## 14. Seguridad (mínimo)

- HTTPS everywhere.
- Secretos MP/SSI en vault/env por tenant cifrados en reposo.
- Rate limit en `/access/oid4vp/*` y login.
- Soft delete / flags peligrosos para borrados.
- No loguear tokens ni cuerpos de credenciales SSI.

---



## 15. Observabilidad

- Request id / correlation id.
- Métricas: pagos aprobados/rechazados, deny reasons de acceso, latencia adapter.
- Alertas: webhook MP fallando, adapter SSI caído.

---



## 16. Decisiones técnicas pendientes (detalle fino)

Stack principal cerrado en §0. Queda por cerrar al scaffold:


| Tema                                                      | Estado                                                                                                                       |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| ORM (Prisma vs Drizzle)                                   | **Prisma 6** (Drizzle descartado; Prisma 7 diferido por ESM/Nest)                                                            |
| Runtime Node                                              | **24 Active LTS** (`node:24-alpine` en Docker)                                                                               |
| Hosting (Railway / Fly / VPS / AWS)                       | Pendiente (prod)                                                                                                             |
| Docker Compose (postgres, redis, api, web, chat-api, mcp) | Hecho (imágenes de build; migrate al arrancar; seed a mano; chat-api C1–C7 salvo tope de uso; mcp C3+C6; drawer Admin chips) |
| CI mínimo (GitHub Actions: lint + build api/web)          | Hecho (`.github/workflows/ci.yml`)                                                                                           |
| Monorepo tool (pnpm workspaces / Turborepo / separado)    | **Separado** — sin package.json raíz; cada app se instala sola                                                               |
| Proveedor exacto de email                                 | Pendiente                                                                                                                    |


---



## 17. Mapa a post-MVP

Ver [99-backlog-post-mvp.md](./99-backlog-post-mvp.md). Impacto arquitectónico ya previsto:

- Credenciales pack vía OID4VCI/OID4VP (Quark).
- Nuevos `ChannelSender`.
- Módulo `shop` aislado.
- Feature flags por plan.
- Offline access = cola local + sync (no en MVP).
- Débito automático MONTHLY: Customer/Card + Payments + cron Nest (no Preference sola). Ver §7.5.
- Asistente: `chat-api` + sidecar `mcp/` + drawer Admin + la misma burbuja en la landing (sesión anónima, solo ayuda de producto) — [16-chat-mcp-diseno.md](./16-chat-mcp-diseno.md).

---

[Índice](./00-indice.md) · [Esquema DB](./09-esquema-db.md) · [Siguiente: Wireframes ASCII →](./07-wireframes-ascii.md)