# Faciliter — Prioridades para cerrar el MVP

**Estado:** Viva (corte 2026-09-08)  
**Qué es:** lo que falta para un primer gym piloto **vendible**. No es el backlog post-MVP ni un rediseño de módulos.  
**Fuera de este corte:** tienda de productos, white label, AFIP, offline puerta, multi-sede UI, **E7 Rutinas** y **E8 Notificaciones N1**.

Roadmap de épicas históricas: [11-roadmap-mvp.md](./11-roadmap-mvp.md). Diferidos: [99-backlog-post-mvp.md](./99-backlog-post-mvp.md).

---

## Orden

| # | Prioridad | Tipo | Estado hoy |
|---|-----------|------|------------|
| P1 | Molinetes / hardware de puerta | Diseño + adapters | En backlog acceso; sin spike de marcas |
| P2 | Débito automático MONTHLY | QA (código ya está) | Implementado; falta probar de punta a punta |
| P3 | Landing + pricing + SEO | Comercial / web pública | Landing + SEO en el apex; precio a convenir; legales borrador |
| P4 | Tokens y costo OpenRouter | Tope C7 + insumo de pricing | Tope C7 pendiente; no hay costo por gym |
| P5 | Migración de datos (Excel + IA) | Ops / onboarding | El **último**; puede no existir en el primer piloto |

---

## P1 — Molinetes

Hoy la puerta es **software**: QR OID4VP en `/puerta` (el afiliado escanea el venue) + evaluación GymBro (`allow` / `deny` + reason). Hay VC de **staff** para el mismo flujo. No hay pulso a un molinete real.

El trabajo no es “otro QR”. Es: **la misma decisión de acceso** tiene que abrir (o no) **hardware distinto**.

Alcance de este corte (sin elegir marca todavía):

1. Inventario de tipos reales (relé/contacto seco, Wiegand, SDK TCP de fabricante, lector QR en el equipo que pega a nuestra API).
2. Contrato estable: GymBro decide `allow`/`deny`; el adapter traduce a “abrir 300 ms”, “beep deny”, etc.
3. Cómo se instala en un gym (PC en mostrador vs box en el molinete vs nube).
4. Qué **no** entra: offline en puerta, biometría de hardware, anti-fraude avanzado, segundo modo de escaneo (gym escanea al afiliado), fichaje horario.

Detalle vivo: [99-backlog-post-mvp/acceso.md](./99-backlog-post-mvp/acceso.md). Diseño SSI: [12-acceso-quark-oid4-diseno.md](./12-acceso-quark-oid4-diseno.md).

Hay que correr el [método de producto](./10-metodo-definicion-producto.md) **antes** de codear un vendor.

Inventario (formas + cómo se enchufa): [ideas/2026-09-08-tipos-molinetes.md](./ideas/2026-09-08-tipos-molinetes.md).  
Necesidades HW/SW: [19-puerta-molinete-hw-sw.md](./19-puerta-molinete-hw-sw.md).

**Forma del primer piloto (abierto):** ¿molinete físico, o `/puerta` en tablet y hardware en paralelo? Se evalúa; no bloquea el inventario de tipos (puntos 1–3).

---

## P2 — Débito automático (probar que ande)

No es feature nueva. Diseño cerrado (RN-PAG-013..016, CU-PAG-008..010). UI en Caja (`/caja?memberId=&vista=debitos`).

Hay que **correr** el flujo con MP de verdad (o sandbox serio): alta del mandato, cobro el día de `endsAt`, fallo de tarjeta, baja, que no cobre si el carrito no era MONTHLY+MP.

Dependencia ops: [E5 validar MP live](./11-roadmap-mvp.md) — sin webhook público el débito no se puede firmar como “anda”.

Checklist: `docs/08-casos-prueba-manuales.md` (P9…).

---

## P3 — Landing, pricing y SEO

Sitio público en el **apex** (`http://localhost:3002/` / dominio de plataforma). El Admin sigue en `{slug}.…` y no se indexa.

Este corte (en código):

- Landing: gyms, clubes y estudios (afiliaciones); CTA a Google Calendar (`https://calendar.app.google/dcTzccnNjB6tTLXR8`); prueba del asistente (sin datos de un gym).
- Un plan visible, **precio a convenir** (sin número hasta P4 / costos reales).
- SEO: title/meta, OG, canonical, JSON-LD, `sitemap.xml`, `robots.txt`, copy en castellano.
- `/legal/terminos` y `/legal/privacidad`: **borrador** (no es el texto final Argentina). El contrato revisado sigue en [operaciones.md](./99-backlog-post-mvp/operaciones.md).

El costo de OpenRouter (P4) alimenta el número de pricing; no al revés.

---

## P4 — Tokens y consumo OpenRouter

El asistente Admin **ya corre** (post-MVP de producto, pero en el repo). La burbuja de la landing **también** llama OpenRouter. OpenRouter se paga. Sin números no se puede poner el chat en un plan ni capar abuse. La landing tiene un tope por IP/hora; el tope por staff sigue pendiente.

Dos capas (no mezclarlas):

| Capa | Para qué |
|------|----------|
| Tope C7 | Mensajes/min o tokens/día por staff — que un loop no tumbe la cuenta. [17](./17-roadmap-chat-mcp.md) |
| Costo | Cuánto sale un gym/mes (p50/p95) para el precio de P3 |

Sin dashboard fancy: logs o suma por `tenant_id` + `user_id` alcanza para el primer número.

---

## P5 — Migración (Excel + IA)

Para un gym que **ya tiene** socios/packs en otro sistema: importar desde planilla (y tal vez ayuda de IA para mapear columnas).

**El de menor prioridad.** Primero el MVP en un gym que carga de cero (o carga a mano). Si el piloto exige migración, se abre después con el [método](./10-metodo-definicion-producto.md).

No entra: sync continua bidireccional, ni conector a un vendor concreto en este corte.

---

## ¿Nos olvidamos de algo importante?

Estas cosas **no** están en P1–P5 y sí importan para “un gym de verdad”. No son el foco de producto que definiste; no desaparecen.

| Ítem | Dónde vive | Por qué importa |
|------------------|-----------------|
| Deploy staging + prod + DNS/SSL | E12 · [operaciones.md](./99-backlog-post-mvp/operaciones.md) | Sin esto no hay piloto ni landing en dominio propio |
| Onboarding gym piloto | E12 | Un gym real es la prueba, no el Compose local |
| Smoke S1–S10 + suite pagos/acceso | E12 · [08](./08-casos-prueba-manuales.md) | Cierre de calidad del núcleo que ya está |
| MP sandbox → live | E5 | Débito (P2) y cobros del piloto |
| Legal ToS + privacidad | operaciones | Landing (P3) y datos de afiliados |
| E7 Rutinas y E8 Notificaciones N1 | Maestro §7 · roadmap | **Fuera de este corte** (2026-09-08). Siguen en el maestro como módulos del MVP histórico; no se implementan ahora |
| Historial packs otros períodos / paginación comprobantes | [app-afiliado.md](./99-backlog-post-mvp/app-afiliado.md) | Nice-to-have del piloto, no bloquea molinete ni pricing |

### Decisiones de este corte

| # | Decisión |
|---|----------|
| 1 | E7 y E8 **no** se atacan en el cierre go-to-market |
| 2 | P3 incluye **SEO** (no era “CEO”) |
| 3 | Primer piloto: molinete físico vs tablet en `/puerta` — **se evalúa** |

---

## Qué no entra (sigue post-MVP)

Tienda de mercadería, white label, AFIP, offline puerta, biometría de hardware, anti-fraude QR, fichaje horario, waitlist modos 2/3, gastos de caja, multi-sede UI, chat writes, E7, E8.

---

[Índice](./00-indice.md) · [Roadmap MVP](./11-roadmap-mvp.md) · [Backlog post-MVP](./99-backlog-post-mvp.md)
