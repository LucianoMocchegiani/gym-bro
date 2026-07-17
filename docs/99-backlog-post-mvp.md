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
| Biometría | |
| Anti-fraude avanzado (préstamo de QR) | |
| Credencial SSI por pack (enfoques A/C) | MVP = credencial de vínculo (B) |
| Segundo modo de escaneo si no entró en MVP | Diseño contempla ambos (C) |

---

## Sesiones / packs

| Ítem | Notas |
|------|--------|
| Recurrencias avanzadas (excepciones, feriados, “solo este lunes”) | MVP: regla simple tipo calendario |
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
