# GymBro — Arquitectura

**Estado:** Cerrado (v1) — arquitectura conceptual de producto  
**No prescribe** stack concreto (Node/Nest, .NET, etc.) salvo donde el negocio lo exige (MP, SSI/Quark).  
**Fuentes:** [01-documento-maestro.md](./01-documento-maestro.md), [03-modelo-dominio.md](./03-modelo-dominio.md), [05-casos-de-uso/](./05-casos-de-uso/)

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
apps/
  api/
  admin-web/
  mobile/
packages/ o modules/
  identity-access/      # auth, roles, tenant context
  members/              # afiliados
  catalog/              # servicios, packs, sesiones
  billing/              # pagos, caja, MP
  access/               # adapter + evaluación de ingreso
  routines/
  notifications/
  audit/
```

---

## 4. Multi-tenant

### 4.1 Modelo

- **Tenant = Gimnasio** (row-level isolation con `tenant_id` en todas las tablas de negocio).
- Super Admin opera fuera del scope de un gym o con selector de tenant para soporte.
- Requests de staff/afiliado llevan tenant resuelto por JWT/sesión (no confiar en body).

### 4.2 Sucursales (S2)

- Tabla/entidad `Sucursal` desde día 1.
- MVP UI: una sucursal activa/default; APIs ya reciben `sucursalId` donde importe (sesión, ingreso, caja).

### 4.3 Plan SaaS GymBro

- Campo `plan` en tenant (hoy un valor).
- Feature flags / módulos habilitados por tenant para cuando existan más planes.

---

## 5. Autenticación y autorización

```text
Login → token (JWT u sesión)
      → claims: userId, profileType (staff|afiliado|super), tenantId?, roles[]
      → middleware carga permisos unión de roles
      → guard por permiso/flag (CU-ROL-006)
```

| Perfil | Notas |
|--------|--------|
| Super Admin | Sin tenant o tenant de soporte |
| Staff | `tenantId` obligatorio; N roles |
| Afiliado | Perfil separado; `tenantId` del gym al que pertenece |

Afiliado y staff **nunca** comparten el mismo perfil de sesión (RN-ROL-005).

---

## 6. Adapter de acceso (puerto + adaptadores)

### 6.1 Puerto (interfaz del core)

```text
AccessIdentityProvider
  resolvePresentation(input) → { tenantId, afiliadoId, credentialRef }
  issueMembershipCredential(afiliado) → credentialRef
  revokeCredential(credentialRef) → void
```

### 6.2 Adaptador MVP

- **Quark / SSI** implementa el puerto.
- GymBro **no** mete packs ni deuda en la credencial (enfoque B).

### 6.3 Evaluación de ingreso (dominio puro)

```text
resolvePresentation
  → load Afiliado + Contrataciones + Reservas + Config
  → decide Allow/Deny + reasonCode
  → persist IntentoIngreso
  → maybe mark asistencia sesión
```

Cambiar a “QR propio” = nuevo adaptador; **misma** evaluación de negocio.

### 6.4 Modos de escaneo

- Contrato de API único: `POST /access/verify` con `mode=gym_scans_member | member_scans_gym` + payload.
- MVP puede exponer un solo mode en UI.

---

## 7. Pagos (Mercado Pago + caja)

### 7.1 Principios

- Credenciales MP **por tenant**.
- Derechos (contratación/reserva) solo tras `aprobado` (RN-PAG-004).
- Toda intención de cobro: `idempotency_key` única de negocio (RN-PAG-005).

### 7.2 Flujo MP

```text
API crea Pago(pendiente, idempotencyKey)
  → Preference/Checkout con cuenta del gym
  → Webhook MP → handler idempotente
  → aprueba → ConfirmationService (contratacion/reserva)
  → Comprobante + Notification E1
```

### 7.3 Caja

- `MovimientoCaja` ligado a `Pago`.
- `ArqueoCaja` por fecha (+ sucursal cuando multi-sede UI).

### 7.4 Devoluciones

- Servicio único `RefundService`: revierte derechos (pack mixto completo), marca pago, intenta refund MP o deja “manual pendiente”, notifica E9, audita.

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

- Append-only `EventoAuditoria`.
- Emisión desde servicios de aplicación en acciones RN-ROL-008 (no solo en controllers).

---

## 12. APIs (contrato conceptual)

Prefijo sugerido: `/api/v1`.

| Área | Ejemplos |
|------|----------|
| Auth | `POST /auth/login`, refresh |
| Super | `POST /super/tenants`, suspend |
| Afiliados | CRUD `/tenants/:tid/members` |
| Catálogo | `/services`, `/packs`, `/sessions`, `/recurrence-rules` |
| Reservas | `/sessions/:id/reservations`, waitlist |
| Billing | `/payments/mp/checkout`, `/payments/cash`, webhooks `/webhooks/mercadopago` |
| Access | `/access/verify`, `/access/manual-pass` |
| Rutinas | `/exercises`, `/routine-templates`, `/assigned-routines` |
| Notif | `/notifications`, `/notification-templates`, preferences |
| Roles | `/roles`, `/staff` |
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
- Rate limit en `/access/verify` y login.
- Soft delete / flags peligrosos para borrados.
- No loguear tokens ni cuerpos de credenciales SSI.

---

## 15. Observabilidad

- Request id / correlation id.
- Métricas: pagos aprobados/rechazados, deny reasons de acceso, latencia adapter.
- Alertas: webhook MP fallando, adapter SSI caído.

---

## 16. Decisiones abiertas (técnicas, no de negocio)

Estas no bloquean la doc de producto; se cierran al iniciar código:

| Tema | Candidatos |
|------|------------|
| Backend language/framework | A elección del dev |
| Mobile | Flutter / RN — alineable con SDK Quark Dart si se usa holder |
| DB | PostgreSQL recomendado |
| Auth provider | Own JWT vs Clerk/Auth0 |
| Hosting | Un cloud simple (Railway/Fly/AWS) |

---

## 17. Mapa a post-MVP

Ver [99-backlog-post-mvp.md](./99-backlog-post-mvp.md). Impacto arquitectónico ya previsto:

- Nuevos `AccessIdentityProvider`.
- Nuevos `ChannelSender`.
- Módulo `shop` aislado.
- Feature flags por plan.
- Offline access = cola local + sync (no en MVP).
