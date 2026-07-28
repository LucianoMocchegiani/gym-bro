# GymBro — Roadmap MVP

**Estado:** Borrador v1  
**Objetivo:** Llegar a un MVP usable (admin web + app afiliado + acceso QR + cobros).  
**Fuera de alcance:** ver [99-backlog-post-mvp.md](./99-backlog-post-mvp.md).  
**Stack:** NestJS · Next.js · Flutter · PostgreSQL ([06-arquitectura.md](./06-arquitectura.md)).

## Cómo usar este doc

1. Las **épicas** van en orden sugerido (dependencias).
2. Debajo de cada una: **tareas** = títulos cortos para ir tomando una a una.
3. Cuando abras una épica en detalle, no hace falta más que esto hasta que toque implementarla.
4. Marcar: `[ ]` pendiente · `[~]` en curso · `[x]` hecho.

---

## Vista rápida

| # | Épica | Entrega |
|---|--------|---------|
| E0 | Fundaciones | Repo, API, DB, auth base |
| E1 | Tenants y roles | Super Admin + staff + permisos |
| E2 | Afiliados | Alta, ficha, cuenta |
| E3 | Catálogo comercial | Servicios, packs, créditos |
| E4 | Sesiones y reservas | Calendario, cupos, lista espera |
| E5 | Pagos y caja | MP + efectivo + arqueo |
| E6 | Acceso QR / SSI | Credencial vínculo + verify |
| E7 | Rutinas | Catálogo gym + asignación + cumplimiento |
| E8 | Notificaciones N1 | Email + in-app |
| E9 | App afiliado | Flutter: cuenta, reservar, QR, rutinas |
| E10 | Admin web | Next: operación diaria del gym |
| E11 | Reportes mínimos | Activos, deuda, ingresos |
| E12 | Cierre MVP | Smoke QA, hardenin, deploy |

---

## E0 — Fundaciones

- [x] Scaffold monorepo (`api` / `web` / `mobile` en la raíz)
- [x] PostgreSQL + ORM (Prisma 6 + modelo `Tenant`; migraciones manuales)
- [x] Módulos Nest base + healthcheck
- [x] Auth JWT + refresh (staff / afiliado / super)
- [x] Middleware multi-tenant (`tenant_id` vía `TenantGuard` / JWT; status en login-refresh)
- [x] Config env + secrets (`.env.example` por app: `api/`, `web/`)
- [x] CI mínimo (lint/build)
- [x] Deploy de desarrollo (Docker Compose local: postgres, redis, api, web)

---

## E1 — Tenants y roles

- [x] CRUD tenant (Super Admin)
- [x] Suspender tenant
- [x] Sucursal seed (S2, 1 visible)
- [x] Roles seed al crear gym
- [x] Crear / listar / editar roles custom
- [x] Asignar roles a staff (multi-rol)
- [x] Flags peligrosos
- [x] Auditoría de acciones críticas
- [x] Perfiles separados afiliado vs staff

---

## E2 — Afiliados

- [x] Alta afiliado
- [x] Editar ficha
- [x] Baja / suspensión
- [x] Estado de cuenta (staff)
- [x] Estado de cuenta (afiliado)
- [x] Emisión / reemisión credencial de vínculo (hook a E6)
  - Member `POST /me/access-credential/issue`; Staff `POST /members/:id/access-credentials/issue`

---

## E3 — Catálogo comercial

- [x] CRUD servicio `ACCESO_LIBRE`
- [x] CRUD servicio `POR_SESIONES`
- [x] CRUD pack (simple / créditos / mixto)
- [x] Componentes de pack + créditos por servicio
- [x] Política de vencimiento de créditos por pack
- [x] Contratación tras pago aprobado
- [x] Cancelación pack mixto (pierde todo)

---

## E4 — Sesiones y reservas

- [x] Crear sesión puntual
- [x] Regla de recurrencia simple
- [x] Ampliar cupo
- [x] Reservar con crédito
- [x] Reservar drop-in (pago)
  - staff stub/caja APPROVED + `coverage=DROP_IN`; precio `service.dropInPrice`; reembolso E5
- [x] Reserva en nombre del afiliado (staff)
- [x] Cancelar reserva (ventana del gym)
- [x] Lista de espera (3 modos)
  - join/leave + liberación **AUTO_ASSIGN** (crédito); MEMBER_CONFIRM / STAFF_CONFIRM config-only (liberación diferida)
- [x] Ingreso tardío a sesión (si config ON)
  - `allowLateSessionEntry` en `tenant_settings` (default OFF); reserva/crédito hasta `endsAt`
- [x] Config: horas cancelación, modo lista espera
  - horas + `waitlistMode` + `allowLateSessionEntry` en `tenant_settings`; flujos confirmación modos 2/3 diferidos

---

## E5 — Pagos y caja

- [x] Conectar cuenta MP del gym
  - `mercadopago_accounts` 1:1; access_token cifrado; PUT/GET/DELETE + test (`mp.connect`); sin checkout
- [x] Checkout MP (pack / mensualidad / drop-in)
  - Member `POST /me/payments/mp/checkout` (pack); Payment PENDING + Preference; contrato al aprobar
- [x] Webhook MP idempotente
  - `POST /webhooks/mercadopago?tenantId=`; simulate stub; dedup `mp_payment_id`
- [x] Cobro en caja
  - `method=CASH` en contrato/drop-in → `cash_movements` (STUB no entra)
- [x] Comprobante interno
  - `receipts` 1:1 pago APPROVED (STUB/CASH); código `GB-######`; sin email N1 / sin backfill
- [x] Caja del día
  - `GET /cash-register/day` (timezone BA)
- [x] Arqueo
  - `POST /cash-register/day/reconcile`; 1 por día; no bloquea cobros
- [x] Solicitud devolución (afiliado)
  - `POST /me/payments/:id/refund-requests`; política fija RN-PAG-012; rechazo con motivo
- [x] Ejecutar devolución (staff + flag)
  - `POST /payments/:id/refunds` (`payments.refund`); total; CASH egreso; MP refund/manual_pending
- [x] Reembolso por doble cobro
  - mismo execute con `motiveCode=doble_cobro`

---

## E6 — Acceso QR / SSI

- [x] Puerto `AccessIdentityProvider`
  - modos `gym_scans_member` | `member_scans_gym`; `ACCESS_PROVIDER=stub`
- [ ] Adapter Quark / SSI
- [x] Emitir / revocar credencial de vínculo
  - tabla `access_credentials`; Member `GET|POST /me/access-credential…`; Staff list/issue/revoke
- [x] `POST /access/verify` (1 modo de escaneo en MVP)
  - ambos modos en API; Staff `access.verify`; respuesta allow/deny + intento
- [x] Evaluación: libre / reserva / deuda / tolerancia / multi-ingreso
  - deuda placeholder 0 días; settings `debtToleranceDays`, `multiEntry*`
- [ ] Pase manual + auditoría
- [x] Historial de ingresos con motivo
  - `GET /access-attempts`; tabla `access_attempts`; `reservations.checked_in_at`
- [x] Config políticas de acceso del gym
  - tolerancia + multi-ingreso en `tenant_settings` (CU-ACC-007 parcial)
- [ ] Pantalla / flujo puerta (tocámetro o escaneo afiliado)

---

## E7 — Rutinas

- [ ] Catálogo de ejercicios del gym
- [ ] Plantilla rutina N días
- [ ] Asignar rutina (copia)
- [ ] Editar plantilla vs editar copia
- [ ] Cumplimiento + descansos + tiempo
- [ ] Mediciones / fotos opcionales
- [ ] Desactivar rutina asignada

---

## E8 — Notificaciones N1

- [ ] Modelo plantilla + preferencias
- [ ] Dispatcher dominio → in-app + email
- [ ] Eventos E1–E9
- [ ] Gym activa/desactiva eventos
- [ ] Afiliado opt-out por evento
- [ ] Plantillas editables (nombre del gym)
- [ ] Bandeja admin / avisos operativos
- [ ] Job avisos por vencer / vencida

---

## E9 — App afiliado (Flutter)

- [ ] Login afiliado
- [ ] Home / estado de cuenta
- [ ] Comprar pack / pagar
- [ ] Calendario y reservar
- [ ] Lista de espera
- [ ] Mi QR / credencial
- [ ] Rutinas y cumplimiento
- [ ] Avisos + preferencias
- [ ] Solicitar devolución

---

## E10 — Admin web (Next.js)

- [ ] Login staff / Super Admin
- [ ] Dashboard mínimo
- [ ] Afiliados
- [ ] Servicios / packs / sesiones
- [ ] Caja y cobros
- [ ] Pase manual / historial acceso
- [ ] Rutinas
- [ ] Roles y config gym
- [ ] Plantillas de notificación
- [ ] Panel Super Admin (tenants)

---

## E11 — Reportes mínimos

- [ ] Afiliados activos
- [ ] Cuotas / packs pagados vs vencidos
- [ ] Ingresos del período (MP + caja)
- [ ] Ingresos por puerta (conteo / denegados)

---

## E12 — Cierre MVP

- [ ] Smoke S1–S10 ([08-casos-prueba-manuales.md](./08-casos-prueba-manuales.md))
- [ ] Suite manual crítica (pagos, acceso, packs)
- [ ] Hardening básico (rate limit verify, secrets)
- [ ] Deploy staging + producción
- [ ] Onboarding primer gym piloto
- [ ] Checklist “MVP hecho”

---

## Orden de ataque sugerido (1 dev)

```text
E0 → E1 → E2 → E3 → E5 (pagos base)
              ↘ E4 (reservas necesitan packs + pagos)
E6 (acceso) en paralelo liviano tras E2
E8 (notif) cuando haya eventos reales (E4/E5)
E7 rutinas puede ir después del núcleo comercial
E9 + E10 UI en paralelo al ir cerrando APIs
E11 → E12
```

---

## Próximo paso

Elegir **pase manual** (E6) o UI puerta / Quark; drop-in MP sigue opcional.

---

[Índice](./00-indice.md) · [Backlog post-MVP](./99-backlog-post-mvp.md) · [Arquitectura](./06-arquitectura.md)
