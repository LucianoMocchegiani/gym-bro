# Auditoría Roadmap MVP vs código (API · Web · Mobile)

**Fecha:** 2026-08-13  
**Fuentes:** [`11-roadmap-mvp.md`](./11-roadmap-mvp.md), código en `api/`, `web/`, `mobile/`  
**Método:** contraste épica por épica; no es checklist de QA smoke.

---

## Ajustes al roadmap (aplicados 2026-08-13)

E9 y E10 en [`11-roadmap-mvp.md`](./11-roadmap-mvp.md) quedaron desglosados en **Hecho** vs **Pendiente** (thin gaps / prereq API). Este doc sigue como evidencia del contraste.

---

## Veredicto breve

El roadmap está **mayormente honesto** en el núcleo (E0–E6, E11) y en lo pendiente duro (E7, E8, E12).

Lo que **no** refleja bien:

1. **E10 Admin marcado `[x]` demasiado ancho** — muchas capacidades de API no tienen UI (devoluciones, waitlist operativa, recurrencia, cancelar contrato, receipts, auditoría, checkout MP staff).
2. **E9 Mobile** — lo cerrado (login, cuenta, SSI) está bien; lo abierto es correcto, pero hay **huecos de API member** (listar packs/sesiones) que bloquean cerrar Tienda/Calendario aunque existan checkout/reservas.
3. **Ítems `[x]` parciales** — waitlist modos 2/3, push offers, StatusList, MP live, naming Quark→Kuatia.
4. **Docs desactualizados** — puertos `3000`/`5432`, tunnels Quark, README mobile vs Kuatia.

---

## Matriz por épica

| Épica | Roadmap | API | Web Admin | Mobile | Notas |
|-------|---------|-----|-----------|--------|-------|
| E0 Fundaciones | `[x]` | OK | OK | OK | Redis en Compose sin uso de dominio |
| E1 Tenants/roles | `[x]` | OK | OK (Super delgado) | N/A | Sucursal solo seed; sin impersonate |
| E2 Afiliados | `[x]` | OK | Parcial (cuenta lectura) | Cuenta OK | Sin acciones comerciales en ficha web |
| E3 Catálogo | `[x]` | OK | CRUD OK | Stub tienda | Packs: falta `creditsExpireAt` en UI |
| E4 Sesiones/reservas | `[x]` | Casi | Delgada | Stub | Waitlist 2/3 sin confirm; sin roster/recurrencia en web |
| E5 Pagos/caja | casi | OK stub | Caja CASH OK | Ausente | MP live `[ ]` correcto; sin refunds/receipts UI |
| E6 Acceso SSI | `[x]` | OK Kuatia | Puerta OK | SSI OK | Push offers / StatusList / reingreso pendientes |
| E7 Rutinas | `[ ]` | Ausente | Ausente | Ausente | Alineado |
| E8 Notificaciones | `[ ]` | Ausente | Ausente | Ausente | Alineado; incluye push offers |
| E9 App afiliado | mixto | Lista para varios `[ ]` | N/A | Auth+cuenta+SSI | Falta catálogo member en API |
| E10 Admin web | casi `[x]` | Amplia | Thin en ops | N/A | Overclaim de “hecho” |
| E11 Reportes | `[x]` | OK | OK | N/A | Deuda $ agregada no existe (proxy) |
| E12 Cierre | `[ ]` | — | — | — | Alineado |

---

## API — qué está bien / qué falta reflejar

### Bien marcado

- E0–E3, E5 (salvo live), E6 núcleo evaluate/OID4VP/offers, E11, E7/E8 ausentes.

### Roadmap `[x]` incompleto o parcial

| Tema | Detalle |
|------|---------|
| Waitlist “3 modos” | Solo `AUTO_ASSIGN` libera cupo; `MEMBER_CONFIRM` / `STAFF_CONFIRM` = config + join, sin flujo confirm |
| Push offers OID4VCI | Diseño doc 12 → E8; no implementado |
| StatusList / revocación al reemitir | No hay |
| Reingreso / ventana sesión configurable | Pendiente (doc 12) |
| Sucursales | Solo seed; sin CRUD API |
| Email comprobante | Atado a E8 |
| Naming | Módulo/rutas/DB `quark_*`; transporte Kuatia |

### Roadmap `[ ]` pero API ya sirve (falta UI)

Para **E9**: checkout MP pack/drop-in, reservas member, waitlist member, refund-requests, receipts, contracts.  
**Bloqueo:** no hay `GET` member de packs activos ni sesiones publicadas (hoy exigen permisos staff).

---

## Web Admin — qué está bien / qué falta

### Cumple checklist E10 “mínimo”

Login, dashboard KPIs, afiliados CRUD, servicios/packs/sesiones CRUD, caja CASH + arqueo, puerta OID4VP + pase manual, roles/staff/config+MP, reportes, Super tenants.

### Overclaim / thin (actualizar roadmap o implementar)

| Gap | Impacto |
|-----|---------|
| Devoluciones staff (`refund-requests` + execute) | Alto — E5 `[x]` sin UI |
| Cancelar contrato desde ficha | Alto |
| Roster sesión + reserva CREDIT + cancel + waitlist staff | Alto |
| Recurrencia sesiones | Medio |
| `creditsExpireAt` + estado sync pack Quark/Kuatia | Medio |
| Comprobantes (receipts) | Medio |
| Auditoría UI | Bajo-medio |
| Checkout MP desde Admin | Medio (piloto puede ser CASH + app) |
| Super nested ops / impersonate | Bajo si soporte entra por slug del gym |
| Nav gated por permisos | Hoy cosmético |

### Correctamente pendientes en roadmap

Rutinas, plantillas de notificación.

### Clientes API web inexistentes

`refunds`, `waitlist`, `recurrence-rules`, `receipts`, `audit`, MP checkout staff, `credential-offers`.

---

## Mobile — qué está bien / qué falta

### Cumple E9 `[x]`

- Login afiliado (slug + email/password)
- Home / `GET /me/account` (packs vigentes, créditos, deuda, próximas reservas en lectura)
- Acceso: scan OID4VCI + OID4VP + bandeja offers + wallet (`identity_core_dart`)
- Ajustes (tema, logout, reset wallet)
- Kuatia defaults: `issuer.kuatia.xyz` / `verifier.kuatia.xyz`

### E9 `[ ]` — correcto pendiente en app

| Feature | App | API member |
|---------|-----|------------|
| Comprar pack / pagar | Placeholder Tienda | Checkout OK; **list packs NO** |
| Calendario / reservar | Placeholder Sesiones | Reservas OK; **list sessions NO** |
| Lista de espera | Ausente | Waitlist OK |
| Solicitar devolución | Ausente | Refund-requests OK |
| Rutinas | Ausente | E7 ausente |
| Avisos | Ausente | E8 ausente |

### Otros gaps mobile

- `ApiClient` sin PATCH (cancel reserva / leave waitlist)
- Sin webview/`url_launcher` para Preference MP
- `recentPayments` en account API no se parsea en Flutter
- Nav real: Inicio · Acceso · Ajustes (roadmap aún menciona hubs viejos en un bullet)

### Docs mobile desactualizados

`mobile/README.md` aún habla de tunnel Quark / puerta stub; el código ya es Kuatia + OID4VP.

---

## Ajustes recomendados al roadmap (texto)

1. **E10:** bajar a `[~]` o añadir subtareas `[ ]` para: devoluciones, waitlist/roster, recurrencia, cancel contrato, receipts, auditoría.
2. **E4:** aclarar waitlist modos 2/3 como `[~]` / diferido (ya hay nota; elevar visibilidad).
3. **E6:** marcar explícitamente pendientes: push offers (E8), StatusList, reingreso.
4. **E9:** añadir prerequisito API “catálogo/calendario member-readable”.
5. **Próximo paso:** reemplazar “listados cerrados” por: **E9 (API member packs/sesiones + Flutter) · E10 thin gaps · E5 MP live · E8**.
6. Actualizar URLs locales en E10 (`:3002` / CORS) y Super “Reintentar Quark” → Kuatia bind.

---

## Orden de ataque sugerido (post-auditoría)

```text
1. API member: GET packs activos + GET sesiones publicadas (ventana)
2. Flutter E9: calendario/reservas/waitlist + tienda/MP + devolución
3. Web E10 thin: devoluciones + cancel contrato + roster/waitlist sesión
4. E5: validar MP sandbox→live (ops)
5. E8 notificaciones (+ hook push/deeplink offers)
6. Completar waitlist MEMBER/STAFF confirm
7. E7 rutinas
8. Rename/alias Quark→Kuatia (gradual)
9. E12 smoke + hardening
```

---

## Inventario rápido de superficie

| Capa | Existe |
|------|--------|
| API módulos dominio | ~24 (sin routines/notifications) |
| Web páginas staff | ~25 rutas bajo AdminShell |
| Web Super | 4 rutas (login + tenants) |
| Mobile features reales | auth, home/account, access, credentials, settings |
| Mobile stubs | sessions, store |

---

[Roadmap](./11-roadmap-mvp.md) · [Arquitectura](./06-arquitectura.md) · [Backlog post-MVP](./99-backlog-post-mvp.md)
