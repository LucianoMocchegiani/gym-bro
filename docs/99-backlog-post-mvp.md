# GymBro — Backlog post-MVP

**Estado:** Cerrado (v1) — lista viva; se actualiza cuando diferimos algo  
**Regla:** Si no está en el MVP del [documento maestro](./01-documento-maestro.md), debe aparecer acá (o ser descartado explícitamente).

---

## Producto / comercial

| Ítem | Notas |
|------|--------|
| Tienda / e-commerce (FitApp mockup) | Módulo después del MVP de gestión. Ver idea: [checkout MP vs ML](./ideas/2026-07-13-stores-mp-vs-ml.md) — socios = MP propio; público = marketplace opcional |
| White label (logo, colores, app “del gym”) | No al inicio |
| Varios planes SaaS GymBro (Starter/Pro/…) | Arquitectura preparada; empaquetado comercial después |
| Módulos acoplados a planes | Cuando existan más planes |

---

## Pagos y compliance

| Ítem | Notas |
|------|--------|
| Facturación electrónica AFIP | MVP = comprobante interno |
| Más medios de pago (además de MP + efectivo) | |
| Contracargos / chargebacks automatizados | |
| Liquidación si GymBro cobrara en el medio | Hoy cobra el gym (MP del tenant) |
| Arqueo / contabilidad avanzada más allá del mínimo | MVP ya tiene arqueo básico |

---

## Acceso / QR

| Ítem | Notas |
|------|--------|
| Modo offline en la puerta | MVP online |
| Molinetes / hardware de terceros | |
| Biometría (candado app / puerta) | Wallet: biometría opcional para desbloquear secreto local (ver diseño Quark) |
| Anti-fraude avanzado (préstamo de QR) | |
| Adapter Kuatia OID4 (issuer/verifier compartidos, VC pack, offers, OID4VP) | Adapter `x-api-key` + bind compartido + Compose sin Quark local. Offers/VP/packs siguen; pendiente: alinear mobile URLs públicas, push E8, reingreso. Diseño: [12-acceso-quark-oid4-diseno.md](./12-acceso-quark-oid4-diseno.md) |
| Segundo modo de escaneo (gym escanea afiliado) | UI demo hoy: afiliado escanea venue (`/puerta`) |
| **Fichaje horario staff** (entrada/salida laboral) | Thin actual: VC staff + molinete (`ok_staff`). Fichaje diferido |
| Wallet / app Flutter perfil staff (aceptar offer) | Thin: Admin emite URI; aceptación en wallet de prueba |

---

## App afiliado / cuenta

| Ítem | Notas |
|------|--------|
| Historial de compras (packs de períodos pasados / futuros apilados) | Inicio solo muestra vigencia **hoy** (`GET /me/account?coverage=current`). Historial = UI + `coverage=all` o endpoint dedicado |
| Comprar pack / pagar desde la app | E9 pendiente |
| Calendario y reservar | E9 pendiente |

---

## Sesiones / packs

| Ítem | Notas |
|------|--------|
| Recurrencias avanzadas (excepciones, feriados, “solo este lunes”) | MVP: regla simple tipo calendario |
| Desactivar regla → cancelar sesiones futuras de esa serie | Hoy `active=false` es solo marca; las sesiones ya materializadas siguen. Post-MVP: al desactivar, cancelar `PUBLISHED` futuras de `recurrence_rule_id` (definir reservas/waitlist) |
| Lista de espera modos 2/3 (confirma afiliado + timeout job; confirma staff) + notif E6 | MVP: cola + liberación AUTO_ASSIGN con crédito |
| Políticas finas de no-show (multas, bans) | Si no se cubren en CU del MVP |
| Multi-sede completa en UX | Modelo S2 desde día 1; UI multi-sede después |

---

## Rutinas / progreso

| Ítem | Notas |
|------|--------|
| Catálogo global de ejercicios GymBro | MVP = catálogo solo del gym |
| UX automática de series (inicio/fin serie, fin rutina, asistencia) | Anotado en craneo; charlar después |
| IA para armar/ajustar rutinas | |
| Rutina del día ligada a una Sesión | MVP: rutinas independientes |

---

## Notificaciones

| Ítem | Notas |
|------|--------|
| WhatsApp / SMS | MVP = Email (N1) |
| Push (N2) | |
| Campañas / motor de reglas (N3) | |
| Multi-canal simultáneo | |

---

## Roles / plataforma

| Ítem | Notas |
|------|--------|
| UI avanzada de matriz de permisos | |
| Plantillas de rol por tipo de negocio | |
| SSO staff, etc. | Si hace falta |

---

## Técnico / deuda de modelo

| Ítem | Notas |
|------|--------|
| Renombrar `cash_movements` | El nombre quedó de cuando caja era solo efectivo. Hoy es el **asiento de caja del día** para CASH y MP (1 `INCOME` / `OUTCOME` por `transaction_item`, no por cart). Candidatos más honestos: `register_movements` o `ledger_movements`. No hace falta para el MVP; es rename + migración Prisma + docs/API. |

---

## Visión lejana (del resumen histórico)

| Ítem | Notas |
|------|--------|
| Nutrición, comunidad, ranking, desafíos | |
| Apple Health, Google Fit, Garmin, Fitbit, etc. | |
| IA alimentación, corrección de ejercicios, recomendaciones | |
| Noticias fitness | |

---

## Descartado / no hacer (por ahora)

| Ítem | Motivo |
|------|--------|
| Tests de código como entregable de esta documentación | QA = manual (equipo GymBro) |
| White label en MVP | Decisión explícita |
| Tienda en MVP | Decisión explícita |

---

## Cómo usar este archivo

1. Antes de sumar scope al MVP, revisar esta lista.  
2. Al cerrar un ítem post-MVP, moverlo a un doc de módulo o marcarlo hecho con fecha.  
3. No borrar historia: preferir estado `Hecho` / `Descartado` con nota.

---

[Índice](./00-indice.md) · Fin de la secuencia principal
