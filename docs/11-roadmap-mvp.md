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
- [ ] Emisión / reemisión credencial de vínculo (hook a E6)

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

- [ ] Crear sesión puntual
- [ ] Regla de recurrencia simple
- [ ] Ampliar cupo
- [ ] Reservar con crédito
- [ ] Reservar drop-in (pago)
- [ ] Reserva en nombre del afiliado (staff)
- [ ] Cancelar reserva (ventana del gym)
- [ ] Lista de espera (3 modos)
- [ ] Ingreso tardío a sesión (si config ON)
- [ ] Config: horas cancelación, modo lista espera

---

## E5 — Pagos y caja

- [ ] Conectar cuenta MP del gym
- [ ] Checkout MP (pack / mensualidad / drop-in)
- [ ] Webhook MP idempotente
- [ ] Cobro en caja
- [ ] Comprobante interno
- [ ] Caja del día
- [ ] Arqueo
- [ ] Solicitud devolución (afiliado)
- [ ] Ejecutar devolución (staff + flag)
- [ ] Reembolso por doble cobro

---

## E6 — Acceso QR / SSI

- [ ] Puerto `AccessIdentityProvider`
- [ ] Adapter Quark / SSI
- [ ] Emitir / revocar credencial de vínculo
- [ ] `POST /access/verify` (1 modo de escaneo en MVP)
- [ ] Evaluación: libre / reserva / deuda / tolerancia / multi-ingreso
- [ ] Pase manual + auditoría
- [ ] Historial de ingresos con motivo
- [ ] Config políticas de acceso del gym
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

Elegir **una épica** (recomendado: **E4 sesión puntual**; SSI/credencial E2 queda enganchado a E6) y bajar solo esa a subtareas del día / PRs.

---

[Índice](./00-indice.md) · [Backlog post-MVP](./99-backlog-post-mvp.md) · [Arquitectura](./06-arquitectura.md)
