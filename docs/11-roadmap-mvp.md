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
| E9 | App afiliado | Flutter: cuenta + SSI hechos; falta tienda/reservas/waitlist/devolución (+ API member packs/sesiones) |
| E10 | Admin web | Next: thin casi cerrados; faltan MP staff / pase sesión opcional |
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
- [x] Emisión / reemisión credencial (vía pack OID4VCI en E6; stub vínculo retirado)

---

## E3 — Catálogo comercial

- [x] CRUD servicio `ACCESO_LIBRE`
- [x] CRUD servicio `POR_SESIONES`
- [x] CRUD pack (simple / créditos / mixto)
- [x] Componentes de pack + créditos por servicio
- [x] Política de vencimiento de créditos por pack
- [x] Contratación tras pago aprobado
  - vigencias RN-CON: MONTHLY un plan; renovación +1 día tras `endsAt` (o día de pago si hueco sin uso de tolerancia); ONE_TIME solapa; fechas opcionales (RN-CON-004)
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
  - Member/Staff pack: `POST /me|members/:id/payments/mp/checkout`
  - Member/Staff drop-in: `POST .../drop-in-checkout` → reserva al APPROVED; STUB/CASH drop-in sigue inmediato
- [x] Webhook MP idempotente
  - `POST /webhooks/mercadopago?tenantId=`; simulate stub; dedup `mp_payment_id`; pack→contrato / drop-in→reserva
- [ ] Validar checkout/webhook MP con cuenta real (sandbox → live)
  - `MP_ACCOUNT_VALIDATE_MODE=live` + `MP_CHECKOUT_MODE=live`; token/public_key de prueba MP del gym
  - `PUBLIC_API_BASE_URL` alcanzable (ngrok u host público) para `notification_url`
  - Preferencia real + pago sandbox; webhook MP (no `/simulate`); pack y drop-in → contrato/reserva
  - Opcional: reembolso MP live; checklist S5 en `docs/08-casos-prueba-manuales.md`
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

- [x] Spike Quark Compose: issuer+verifier + provision al crear tenant (soft-fail + `POST …/quark/provision`)
  - **Superseded:** Kuatia compartido — Compose sin quark local; provision = bind `KUATIA_*_WALLET_ID`
- [x] Pack → `credentialConfigurationsSupported` en issuer Quark (soft-fail + `packs.quark_*`)
- [x] Offer OID4VCI al pack APPROVED + `credential_offers` + `GET /me/credential-offers` (re-oferta = re-POST contrato misma key)
- [x] Bandeja Flutter “Aceptar” + `identity_core_dart` + `ACCEPTED` / `FAILED` en API (`POST …/accept` | `…/fail`)
- [x] Puerta OID4VP (modo B) + evaluate
  - Staff `POST /access/oid4vp/request` + `GET /access/oid4vp/session/:id`; identidad = claim `memberId`
  - Stubs retirados (`ACCESS_PROVIDER`, `access-credentials`, `/access/verify`, `/me/access/check-in`, `stub-venue`)
- [x] Evaluación: libre / reserva / deuda / tolerancia / multi-ingreso
  - deuda = días desde `endsAt` del último libre; gracia `ok_deuda_tolerancia`; settings `debtToleranceDays`, `multiEntry*`
  - renovación MONTHLY: +1 día tras `endsAt` si vigente o usó tolerancia; si no, día de pago
- [x] Pase manual + auditoría
  - `POST /members/:id/access/manual-pass` (`access.manual_pass`); no cuenta para multi-ingreso
- [x] Historial de ingresos con motivo
  - `GET /access-attempts`; tabla `access_attempts`; `reservations.checked_in_at`
- [x] Config políticas de acceso del gym
  - tolerancia + multi-ingreso en `tenant_settings` (CU-ACC-007 parcial)
- [x] Pantalla / flujo puerta (tocámetro)
  - Admin web: `/puerta` QR OID4VP + poll; App: Escanear → share VP
  - API: CORS `CORS_ORIGIN` (default `http://localhost:3000`)


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

**Estado real (2026-08-13):** auth + cuenta + wallet SSI OK. Tienda/calendario/waitlist/devolución pendientes.  
**Bloqueo API:** hoy `GET /packs` y `GET /sessions` exigen permisos staff; hace falta lectura member (o endpoint `/me/...`) antes de cerrar Tienda/Calendario.  
Detalle: [14-auditoria-roadmap-vs-codigo-2026-08-13.md](./14-auditoria-roadmap-vs-codigo-2026-08-13.md).

### Hecho

- [x] Login afiliado
  - Flutter: slug + email/password; API `tenantSlug` (o `tenantId`); sesión secure storage + refresh
- [x] Home / estado de cuenta
  - `GET /me/account?coverage=current`; packs vigentes, créditos, deuda, próximas reservas (lectura)
  - Nav real: **Inicio · Acceso · Ajustes** (tema claro/oscuro)
- [x] Acceso + Credenciales (SSI)
  - Escanear OID4VCI/VP + bandeja offers (`accept`/`fail`) + `identity_core_dart`
  - Kuatia: defaults `issuer.kuatia.xyz` / `verifier.kuatia.xyz` (`KUATIA_*_PUBLIC_URL`)
  - Puerta Admin `/puerta` = QR OID4VP (modo B)

### Pendiente — prerequisito API

- [ ] Lectura member de catálogo/calendario
  - `GET` packs activos comprables (sin `catalog.write`)
  - `GET` sesiones publicadas en ventana de fechas (sin `sessions.write`)
  - Postman + docs al agregar endpoints

### Pendiente — app (API member ya cubre gran parte)

- [ ] Comprar pack / pagar (Tienda)
  - Reemplazar `StorePlaceholderScreen`
  - Listar packs → `POST /me/payments/mp/checkout` → abrir Preference (`url_launcher`)
  - Parsear `recentPayments` del account (hoy la API los manda; Flutter no)
- [ ] Calendario y reservar
  - Reemplazar `SessionsPlaceholderScreen`
  - Listar sesiones → `POST /me/reservations` (crédito) → cancel `PATCH …/status`
  - Extender `ApiClient` con PATCH
- [ ] Lista de espera
  - Join/leave (`POST/GET/PATCH /me/waitlist`) desde sesión llena
- [ ] Solicitar devolución
  - `POST /me/payments/:id/refund-requests` + listado solicitudes
  - UI desde pagos recientes / cuenta
- [ ] Drop-in (opcional en mismo corte tienda/sesiones)
  - `POST /me/payments/mp/drop-in-checkout` con `sessionId`

### Pendiente — depende de otras épicas

- [ ] Rutinas y cumplimiento → **E7** (sin API)
- [ ] Avisos + preferencias → **E8** (sin API)

### Notas

- Placeholders actuales: `features/store/`, `features/sessions/`.
- README mobile: actualizar tunnels Quark → Kuatia cuando se toque la épica.

---

## E10 — Admin web (Next.js)

**Estado real (2026-08-14):** núcleo E10 + thin hasta comprobantes y auditoría UI.  
**Overclaim previo:** varios ítems se marcaban `[x]` sin UI para APIs ya hechas — abajo queda el desglose.  
Detalle: [14-auditoria…](./14-auditoria-roadmap-vs-codigo-2026-08-13.md).

### Hecho (mínimo operativo)

- [x] Login staff / Super Admin
  - Staff: `{slug}.localhost:3002/login` (o `{slug}.{APP_DOMAIN}`); Super: `/super/login`
- [x] Dashboard mínimo
  - `/`: KPIs del día (caja, activos, sin pack proxy, puerta, sesiones) + atajos
  - Deuda $ agregada: no hay endpoint; proxy vía reportes / sin pack
- [x] Afiliados (CRUD + cuenta lectura)
  - `/afiliados` listado/filtro, alta, ficha, status, estado de cuenta
- [x] Servicios / packs / sesiones (CRUD básico)
  - `/servicios`, `/packs`, `/sesiones` (puntual; cancelar + ampliar cupo)
- [x] Caja y cobros CASH
  - `/caja`: día + movimientos + arqueo; cobro pack/drop-in CASH
- [x] Pase manual / historial acceso
  - `/puerta` tabs Verificar | Pase manual | Historial; `/puerta/pase-manual` → `?tab=pase`
- [x] Roles y config gym
  - `/roles` + `/staff`; `/config` (tenant-settings + cuenta MP connect/test)
- [x] Reportes E11 en UI
  - `/reportes` + historial puerta en `/puerta`
- [x] Panel Super Admin (tenants) — mínimo
  - `/super/tenants` CRUD/suspend + bind Kuatia (`…/quark/provision`) + link al gym
  - Sin impersonate ni nested ops del tenant

### Pendiente — thin gaps (API ya existe)

- [x] Devoluciones staff
  - `/devoluciones`: listar `GET /refund-requests` + ejecutar `POST /payments/:id/refunds`
  - Motivos `solicitud` / `doble_cobro` / `otro`; confirmación tipada; atajo desde pagos APPROVED en ficha afiliado
- [x] Cancelar contrato desde ficha afiliado
  - `PATCH /contracts/:id/status` → `CANCELLED` (RN-SER-009); motivo opcional → auditoría
  - UI en `/afiliados/[id]`: confirmación `CANCELAR`; no reembolsa (eso es Devolver)
- [x] Sesión: roster + reservas staff
  - `GET /sessions/:id/reservations` (+ nombre afiliado); UI en `/sesiones/[id]`
  - Alta CREDIT + cancelar reserva (`reservations.write`); drop-in sigue en Caja
- [x] Waitlist operativa (staff)
  - Cola en `/sesiones/[id]`: `GET /sessions/:id/waitlist` (+ `allStatuses`); alta staff; quitar (`LEFT`)
  - Badge `waitlistMode`; AUTO ya promociona al liberar cupo; modos 2/3 sin acciones nuevas
- [x] Recurrencia de sesiones (UI)
  - Toggle puntual/recurrente en `/sesiones/nuevo`; listado + desactivar en `/sesiones` (vista Recurrencias)
  - Timezone fijo `America/Asuncion`; excepciones siguen en ficha de sesión
  - Nota: desactivar hoy no cancela sesiones → [backlog](./99-backlog-post-mvp.md)
- [x] Packs: `creditsExpireAt` + visibilidad sync Kuatia (`packs.kuatia_*`)
  - Fecha opcional en nuevo/editar; bloque solo lectura Kuatia en `/packs/[id]`
- [x] Comprobantes (receipts)
  - Caja: link en movimientos + panel tras cobro; ficha afiliado: listado + por pago
  - `GET /payments/:id/receipt`, `GET /members/:id/receipts` (`members.read`)
- [x] Auditoría UI
  - `/auditoria`: `GET /audit-events` (`audit.read`); búsqueda `q` + detalle before/after
- [x] Nav / páginas gated por permiso (hoy se muestran todos los links)
  - `GET /me/permissions` + filtro nav/atajos; API sigue autorizando (403)
- [x] Pase manual: selector de sesión opcional (`sessionId`)
  - UI: reservas CONFIRMADAS del afiliado (clase no terminada); default Sin sesión
- [x] Checkout MP desde Admin (staff)
  - Caja: medio Efectivo | MP; pack (`members.write`) y drop-in (`reservations.write`); abrir/copiar link
- [x] Credential offers staff (afiliado OID4VCI en ficha)
  - Ficha afiliado: `GET /members/:id/credential-offers`; copiar URI; re-emitir (re-POST contrato)
- [x] Credencial SSI **staff** para molinete
  - `staff_credential_offers` + `POST/GET /staff/:id/credential-offers`; puerta DCQL pack|staff; `ok_staff`
  - Fichaje horario → [backlog](./99-backlog-post-mvp.md)
- [x] Listados Admin unificados (`DataTable` / `ListToolbar` / paginación)
  - afiliados, staff, servicios, packs, sesiones, roles, auditoría, Super tenants
  - `StatusPill`; reportes, devoluciones, historial puerta (+ pager)
  - `AdminModal`; devolución directa / ejecutar solicitud en modal
  - Alta servicio/rol en modal (`?nuevo=1`; `/nuevo` redirige)
  - Alta staff + Super tenant en modal
  - Caja: `ListToolbar` + `DataTable` movimientos (sin tabs)
  - Editar servicio/rol + alta afiliado en modal; roster/waitlist thin
  - Acciones de grilla con iconos (`RowActions`); afiliados: Ficha / Cuenta en modal comfortable
  - Staff: Roles / Credencial en modal comfortable (`?roles=` / `?credencial=`)
  - Packs: editar + alta en modal; sesiones: Datos / Roster / Waitlist + alta (`?nuevo=1`)
  - Cleanup: `PackComponentsEditor` compartido; sin prop `wide` deprecada; paneles `embedded` en modal

### Pendiente — otras épicas / Super

- [ ] Rutinas (Admin) → **E7**
- [ ] Plantillas de notificación → **E8**
- [ ] Super: impersonar o nested members/staff/caja (wireframe §14; API Super ya espeja mucho)

### Clientes `web/lib/api` a agregar (thin gaps)

(ninguno crítico).
(`refunds`, `waitlist`, `recurrence-rules`, `receipts`, `audit`, MP checkout staff, `credential-offers` ya agregados.)

---

## E11 — Reportes mínimos

- [x] Afiliados activos
  - conteo por status + proxy “sin pack activo” (`ACTIVE` sin contrato `ACTIVE`)
- [x] Cuotas / packs pagados vs vencidos
  - contratos `ACTIVE` / `EXPIRED` / cancelados / reembolsados (punto en el tiempo)
- [x] Ingresos del período (MP + caja)
  - `GET /reports/summary?from&to` — totales por medio + detalle con nombre; UI `/reportes`
- [x] Ingresos por puerta (conteo / denegados)
  - En `/puerta`: historial nominado + filtro fecha/resultado; API `access-attempts?from&to`

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

Roadmap E9/E10 realineados (2026-08-13) tras [auditoría](./14-auditoria-roadmap-vs-codigo-2026-08-13.md).

**Orden sugerido para cerrar faltantes UI:**

```text
1) Flutter E9: Tienda/MP + calendario/reservas + waitlist + devolución
   (prereq: API member GET packs + sesiones)
2) Admin E10 thin: MP staff / pase sesión opcional
   → recurrencia / creditsExpireAt / receipts (después)
3) E5 MP live (ops) → E8 → E7 → E12
```

E7/E8 siguen `[ ]` (sin API). No marcar E9/E10 como cerradas hasta agotar las subtareas “Pendiente” de cada sección.

---

[Índice](./00-indice.md) · [Backlog post-MVP](./99-backlog-post-mvp.md) · [Arquitectura](./06-arquitectura.md)
