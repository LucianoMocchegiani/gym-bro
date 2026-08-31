# GymBro — Arquitectura

**Estado:** Cerrado (v1) — arquitectura conceptual + stack MVP  
**Fuentes:** [01-documento-maestro.md](./01-documento-maestro.md), [03-modelo-dominio.md](./03-modelo-dominio.md), [05-casos-de-uso/](./05-casos-de-uso/)

---

## 0. Stack elegido (MVP)

| Capa | Tecnología | Notas |
|------|------------|--------|
| **API / backend** | **NestJS 11 + TypeScript 5.9** | Monolito modular; runtime **Node 24** (Active LTS) |
| **Web admin / Super Admin** | **Next.js 16 (App Router) + React 19** | App en `web/` |
| **App móvil** | **Flutter** | Afiliado + acceso QR; alineado a Quark / identity-core-dart |
| **Base de datos** | **PostgreSQL 16** | Multi-tenant por `tenant_id` |
| **ORM** | **Prisma 6** (`api/prisma/`) | Migraciones manuales; modelo inicial `Tenant`. Prisma 7 diferido (ESM) |
| **Auth API** | JWT + refresh (propio) en MVP | Clerk/Auth0 opcional después |
| **Jobs** | BullMQ + Redis (cuando haga falta) | Vencimientos, mails, recurrencias |
| **Email N1** | Proveedor ESP (Resend/SES/similar) | |
| **Storage** | Object storage S3-compatible | Fotos de progreso |
| **Pagos** | Mercado Pago (cuenta del gym) | |
| **Acceso** | Adapter SSI / Quark | Intercambiable |

Estructura de repo sugerida:

```text
api/            # NestJS (+ prisma/)
web/            # Next.js (Admin / Super Admin)
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
┌─────────────┐     ┌─────────────┐     ┌──────────────────┐
│ App móvil   │     │ Web Admin   │     │ Web Super Admin  │
│ (afiliado + │     │ (staff gym) │     │ (GymBro)         │
│  staff luz) │     │             │     │                  │
└──────┬──────┘     └──────┬──────┘     └────────┬─────────┘
       │                   │                     │
       └────────────┬──────┴─────────────────────┘
                    ▼
            ┌───────────────┐
            │  API GymBro   │
            │  (backend)    │
            └───────┬───────┘
                    │
     ┌──────────────┼──────────────┬─────────────────┐
     ▼              ▼              ▼                 ▼
┌─────────┐  ┌───────────┐  ┌────────────┐  ┌────────────────┐
│  DB     │  │ Mercado   │  │ Access     │  │ Email (N1)     │
│ tenant  │  │ Pago      │  │ Adapter    │  │ proveedor SMTP │
│ scoped  │  │ (x gym)   │  │ → Quark    │  │ / ESP          │
└─────────┘  └───────────┘  └────────────┘  └────────────────┘
```

---

## 3. Estilo de despliegue recomendado (MVP)

| Opción | Cuándo |
|--------|--------|
| **Modular monolith** (recomendado) | Un deploy, módulos por carpetas/bounded contexts |
| Microservicios | Post-MVP solo si un módulo lo exige (ej. acceso de alto QPS) |

Estructura lógica interna:

```text
api/                    # NestJS (módulos por dominio dentro de src/)
web/                    # Next.js — Admin (slug.localhost) + Super (/super)
mobile/                 # Flutter
# Dominios Nest (api/src):
#   auth, tenants, members, staff, roles, services, packs, sessions,
#   reservations, waitlist, contracts, mercadopago, cash-register,
#   refunds, receipts, access, quark, audit, reports, tenant-settings, …
```

CORS: la API acepta orígenes de `CORS_ORIGIN` (default `http://localhost:3000`) para el panel web.

---

## 4. Multi-tenant

### 4.1 Modelo

- **Tenant = Gimnasio** (row-level isolation con `tenant_id` en todas las tablas de negocio).
- Super Admin opera fuera del scope de un gym (sin impersonación en MVP).
- Staff/afiliado: `tenantId` del **JWT** (`TenantGuard` + `@CurrentTenant()` / `@RequireTenantAuth()`). Nunca confiar en body (RN-TEN-001).
- Tenant **suspendido**: se corta en **login/refresh**; el access JWT puede vivir hasta su TTL (~15 min).

### 4.2 Sucursales (S2)

- Tabla `branches` (modelo Prisma `Branch`) desde día 1.
- MVP UI: una sucursal activa/default; APIs ya pueden exponer `defaultBranch` en respuestas Super (`POST/GET /api/tenants`).
- Al crear tenant: seed automático `Sede principal` (`is_default = true`). Sin CRUD multi-sede en esta etapa.

### 4.3 Plan SaaS GymBro

- Campo `plan` en tenant (hoy un valor).
- Feature flags / módulos habilitados por tenant para cuando existan más planes.

---

## 5. Autenticación y autorización

```text
Login por perfil → access JWT + refresh (Postgres)
      → claims: sub, profileType (SUPER|STAFF|MEMBER), tenantId?, email
      → JwtAuthGuard
      → (E1) permisos unión de roles + flags (CU-ROL-006)
```

| Perfil | Notas | Endpoint login |
|--------|-------|----------------|
| Super Admin | Sin tenant (RN-ROL-001) | `POST /api/auth/super/login` |
| Staff | `tenantId` obligatorio | `POST /api/auth/staff/login` |
| Afiliado | Perfil separado (RN-ROL-005) | `POST /api/auth/member/login` |

También: `POST /api/auth/refresh`, `POST /api/auth/logout`, `GET /api/auth/me` (incluye `tenantId` para staff/member), `POST /api/auth/change-password` (JWT; verifica la actual con bcrypt y revoca todos los refresh tokens del usuario → obliga a re-login).

Rutas de negocio del gym: `@RequireTenantAuth()` + `@CurrentTenant()` (módulo `tenant/`).
Rutas de plataforma (Super): `@RequireSuperAuth()` — `GET|POST|PATCH /api/tenants` (create seedéa branch + roles Admin/Profesor; catálogo global `permissions`).
Autorización fina staff: `@RequirePermission('code')` (unión de roles; permisos `dangerous` = flags RN-ROL-007). Super bypass en rutas Super.

Afiliado y staff **nunca** comparten el mismo perfil de sesión (RN-ROL-005).

Pruebas manuales: colección Postman en [`postman/`](../postman/).

---

## 6. Adapter de acceso (OID4VP)

### 6.1 Flujo OID4VP (implementado)

```text
Staff POST /access/oid4vp/request
  → Quark verifier crea authorization request (DCQL pack VC + memberId/tenantId)
  → QR = requestUri
App afiliado escanea → OID4VP share
Staff GET /access/oid4vp/session/:id (poll)
  → Quark session cruda; si hay vp_token → decode SD-JWT (Postman 02.7) → memberId
  → evaluateAndPersist → access_attempts
```

Identidad = claim `memberId` de la VC de pack (`urn:gymbro:pack:{id}`). Sin stub de vínculo ni `stub-venue`. Claims se mapean en GymBro (no en Quark).

### 6.2 Stubs retirados

- Eliminados: `ACCESS_PROVIDER=stub`, `AccessIdentityProvider` stub, `POST /access/verify`, `POST /me/access/check-in`, endpoints `access-credentials`.
- Tabla `access_credentials` queda legada (sin API).

### 6.2b Kuatia (OID4VCI + OID4VP)

Diseño: [12-acceso-quark-oid4-diseno.md](./12-acceso-quark-oid4-diseno.md). Docs API: [kuatia.xyz/docs](https://kuatia.xyz/docs).

**Modelo:** 1 producto Kuatia “GymBro” → **1 issuer + 1 verifier** compartidos. Gyms se distinguen por claims (`tenantId`, `packId`), no por wallets.

**Implementado (corte adapter):**
- Compose **sin** `quark-issuer` / `quark-verifier`; bases y keys en `KUATIA_*` (`api/.env`).
- Auth admin: header `x-api-key` (`iss_live_…` / `ver_live_…`) en `HttpQuarkAdminAdapter`.
- Al `POST /api/tenants`: solo DB GymBro + **bind** de wallet IDs compartidos (`READY` / `MISSING` si falta env). No crea issuer/verifier.
- Reintento Super: `POST /api/tenants/:id/quark/provision` (mismo bind).
- Create/update pack → `PATCH …/records/metadata` del issuer compartido (`pack_{id}` / `urn:gymbro:pack:{id}`; soft-fail en `packs.quark_*`).
- Offer / VP: mismos flujos, contra IDs fijos de env.
- Columnas/módulo `quark_*` se mantienen por compatibilidad de schema/API.

### 6.3 Evaluación de ingreso (dominio puro)

```text
memberId (desde VC OID4VP o pase manual)
  → load Afiliado + Contrataciones + Reservas + Config
  → decide Allow/Deny + reasonCode
  → persist IntentoIngreso (access_attempts)
  → maybe mark asistencia sesión (reservations.checked_in_at)
```

Implementado: `POST /access/oid4vp/request` + `GET /access/oid4vp/session/:id` (Staff) y pase manual. Deuda = días calendario (BA) desde `endsAt` del último contrato libre; tolerancia vía `debtToleranceDays` (`ok_deuda_tolerancia` / `deuda_excedida`).

### 6.4 Modos de escaneo

- MVP UI: solo **modo B** (afiliado escanea QR de puerta = `requestUri` OID4VP).
- Admin: `/puerta`. App: hub Acceso → Escanear.

---

## 7. Pagos (Mercado Pago + caja)

### 7.1 Principios

- Credenciales MP **por tenant** (`mercadopago_accounts`; access_token cifrado; permiso `mp.connect`).
- Derechos (contratación/reserva) solo tras `aprobado` (RN-PAG-004).
- Toda intención de cobro: `idempotency_key` única de negocio (RN-PAG-005).

### 7.1b Cuenta MP (CU-PAG-006)

```text
Admin PUT /mercadopago/account { accessToken, publicKey }
  → (opcional) MpAccountPort.validateAccessToken → /users/me
  → cifra token → upsert mercadopago_accounts
  → GET status sin secretos; POST test; DELETE desconecta
```

Checkout/webhook implementados (stub local + modo live). Pendiente en roadmap: validación E2E con cuenta MP real.

### 7.2 Flujo MP

```text
Member POST /me/transaction-items/mp/checkout (pack + idempotencyKey)
  → Payment(PENDING, method=MP) + Preference (cuenta del gym)
  → Webhook POST /webhooks/mercadopago?tenantId=… (o /simulate en stub)
  → aprueba → ContractsService.confirmFromApprovedPayment + recibo
  → rechaza → Payment REJECTED (sin derechos)
```

Env: `MP_CHECKOUT_MODE=stub|live`, `PUBLIC_API_BASE_URL` (notification_url).

Ítems de la Preference (`title` / `description`): mismo criterio que el comprobante interno (pack = nombre + servicios/créditos; drop-in = servicio · sede · horario). El modal de MP lista sobre todo `title`.

### 7.3 Caja

- `MovimientoCaja` ligado a `Pago`.
- `ArqueoCaja` por fecha (+ sucursal cuando multi-sede UI).
- Admin: `/arqueo` = **Cierre**; `/devoluciones` = **Solicitudes de devolución** (`refund_requests`). Grilla: `kind` (ingreso/egreso) + `category` (`SALE` / `REFUND`) **derivada de `kind`** en `buildLedgerRows`. Post-MVP: columna/enum persistido en `cash_movements` (compra y gastos no se infieren del sentido del dinero). Ver backlog Pagos.

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

---

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
- Lectura: Staff `GET /api/audit-events` (`audit.read`); Super `GET /api/tenants/:tenantId/audit-events`.
- Acciones futuras (pase manual, devoluciones, baja afiliado) reutilizan `AuditService.record`.

---

## 12. APIs (contrato conceptual)

Prefijo sugerido: `/api/v1`.

| Área | Endpoints / CU relacionados |
|------|------------------------------|
| Auth | `POST /auth/login`, refresh |
| Super | `GET|POST /tenants`, `GET|PATCH /tenants/:id` (nombre y/o `status` ACTIVE\|SUSPENDED) |
| Afiliados | CRUD `/tenants/:tid/members` |
| Catálogo | `/services`, `/packs`, `/sessions`, `/recurrence-rules` |
| Reservas | `/sessions/:id/reservations`, waitlist |
| Billing | `/transaction-items/mp/checkout`, `/transaction-items/cash`, webhooks `/webhooks/mercadopago` |
| Access | `/access/oid4vp/request`, `/access/oid4vp/session/:id`, `/access-attempts`, manual-pass |
| Rutinas | `/exercises`, `/routine-templates`, `/assigned-routines` |
| Notif | `/notifications`, `/notification-templates`, preferences |
| Afiliados | Super/Staff CRUD members + PATCH status (`members.deactivate`); estado de cuenta `GET /members/:id/account` / `GET /me/account?coverage=current\|all` |
| Sesiones | Staff `GET|POST|PATCH /sessions`, `PATCH /sessions/:id/capacity` (ampliar cupo) + `/session-recurrence-rules` (`sessions.write`); Super mirrors bajo `/tenants/:tid/...` |
| Reservas | Member `/me/reservations` (crédito) + cancel; Staff `/members/:id/reservations` (crédito o drop-in stub/caja) + `/reservations/:id/status` (`reservations.write`) |
| Waitlist | Member `/me/waitlist`; Staff `/members/:id/waitlist`, `/sessions/:id/waitlist` (`reservations.write`; query `status` / `allStatuses`); promoción AUTO al liberar cupo |
| Settings | Staff `GET|PATCH /tenant-settings` (`tenant.settings.*`; horas cancelación, `waitlistMode`, `allowLateSessionEntry`); Super `/tenants/:tid/settings` |
| Caja | Staff `GET /payment-register/day`, `POST /payment-register/day/reconcile` (`cashier.operate`); Super `/tenants/:tid/cash-register/...`; ingresos = cart; egresos = una ejecución de devolución |
| Mercado Pago | Staff `GET|PUT|DELETE /mercadopago/account`, `POST .../test` (`mp.connect`); Member `POST /me/transaction-items/mp/checkout`; webhook `POST /webhooks/mercadopago`; Super `/tenants/:tid/mercadopago/account` |
| Devoluciones | Member `POST /me/transaction-items/:id/refund-requests`, `GET /me/refund-requests`; Staff `GET /refund-requests`, `POST /transactions/:id/refunds` (lote) y `POST /transaction-items/:id/refunds` (wrapper) (`transaction_items.refund`) |
| Comprobantes | Member `/me/receipts`; Staff `GET /receipts/:id`, `GET /transactions/:id/receipt`, `GET /members/:id/receipts` (`members.read`); `lines[]` (pack → contrato/vigencia + `services[]`; drop-in → reserva/horario) |
| Catálogo | Super/Staff CRUD services + packs (`catalog.write`; kind inferido; `creditsExpireAt`) |
| Contrataciones | Staff `POST /members/:id/contracts` (pago stub APPROVED); `PATCH /contracts/:id/status` → `CANCELLED` (pierde derechos, RN-SER-009); Member `GET /me/contracts` |
| Roles | Super/Staff list-get-create-patch roles; `PUT .../staff/:id/roles`; Staff `GET /me/permissions` (UI nav) |
| Auditoría | Staff `/auditoria` → `GET /audit-events` (`audit.read`); Super mirror; escritura en mutaciones |
| Reportes | Staff `GET /reports/summary?from&to` (`reports.read`); ingresos $ + devoluciones + snapshot; `transactions[]` misma fila que caja |
| Caja | `/cash/day`, `/cash/close` |

Todas las rutas de tenant validan membership/permiso + `tenant_id` del token.

---

## 13. Datos y consistencia

| Tema | Enfoque MVP |
|------|-------------|
| Transacciones | DB transacciones al confirmar pago → derechos |
| Webhooks | Inbox de eventos MP con dedup por id MP + idempotencyKey |
| Jobs | Cron: generar sesiones, avisar vencimientos (E2/E3), reintentos email |
| Archivos | Object storage para fotos progreso |

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

| Tema | Estado |
|------|--------|
| ORM (Prisma vs Drizzle) | **Prisma 6** (Drizzle descartado; Prisma 7 diferido por ESM/Nest) |
| Runtime Node | **24 Active LTS** (`node:24-alpine` en Docker) |
| Hosting (Railway / Fly / VPS / AWS) | Pendiente (prod) |
| Docker Compose local (postgres, redis, api, web) | Hecho (dev) |
| CI mínimo (GitHub Actions: lint + build api/web) | Hecho (`.github/workflows/ci.yml`) |
| Monorepo tool (pnpm workspaces / Turborepo / separado) | **Separado** — sin package.json raíz; cada app se instala sola |
| Proveedor exacto de email | Pendiente |

---

## 17. Mapa a post-MVP

Ver [99-backlog-post-mvp.md](./99-backlog-post-mvp.md). Impacto arquitectónico ya previsto:

- Credenciales pack vía OID4VCI/OID4VP (Quark).
- Nuevos `ChannelSender`.
- Módulo `shop` aislado.
- Feature flags por plan.
- Offline access = cola local + sync (no en MVP).

---

[Índice](./00-indice.md) · [Esquema DB](./09-esquema-db.md) · [Siguiente: Wireframes ASCII →](./07-wireframes-ascii.md)
