# Faciliter — Prioridades para cerrar el MVP

**Estado:** Viva (corte 2026-09-30)  
**Qué es:** lo que falta para un primer gym piloto **vendible**. No es el backlog post-MVP ni un rediseño de módulos.  
**Fuera de este corte:** tienda de productos, white label, AFIP, offline puerta, multi-sede UI, **rutinas plantilla (backlog)** y **push N2**. E7 carpeta y E8 N1 (email + in-app, plantillas Admin, eventos cableados salvo puerta) están en el producto; bandeja operativa staff sigue pendiente.

Roadmap de épicas históricas: [11-roadmap-mvp.md](./11-roadmap-mvp.md). Diferidos: [99-backlog-post-mvp.md](./99-backlog-post-mvp.md).

---

## Orden

| # | Prioridad | Tipo | Estado hoy |
|---|-----------|------|------------|
| P1 | Molinetes / hardware de puerta | Diseño + adapters | **Contrato en código:** sistema de puerta por gym (Kuatia default / ZKTeco), un evaluate para todos los canales, ZKTeco simulado por API + vínculos número → socio/staff, canal en historial. En gym ZK no se emite nada a Kuatia. Falta relé/agente real y puente del aparato |
| P2 | Débito automático MONTHLY | QA live | Código: suscripción MP + `init_point`. Falta P9…P9j en VPS |
| P3 | Landing + pricing + SEO | Comercial / web pública | Apex + catálogo + **alta self-serve**. Falta renovar/cambiar pack y baja de mandato; legales finales; precio a convenir |
| P4 | Tokens y costo OpenRouter | Tope staff + insumo de pricing | C7 (abort/título/chips) en repo. Tope **staff** pendiente; landing ya tiene tope por IP. Sin costo $/gym |
| P5 | Migración de datos (Excel + IA) | Ops / onboarding | **v1 en código** (en testeo): Afiliados → Importar (planilla + zip fotos/carpeta), mapeo heurístico. Falta IA de mapeo y “olvidé mi contraseña” por mail |

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

**Contrato (P1, hecho):** `tenant_settings.access_provider` elige el sistema (RN-ACC-010). Toda entrada (Kuatia OID4VP, evento ZKTeco, pase manual) pasa por `evaluateSubject` con las mismas reglas y guarda `channel`. Packs/contratos emiten por `CredentialIssuerPort` (Kuatia emite; ZKTeco no-op). Tras un allow ZKTeco se llama a `DoorActuatorPort` (hoy solo registra). Identidad ZKTeco: vínculo o DNI (RN-ACC-011). Detalle: [06 §6.5](./06-arquitectura.md).

Inventario (formas + cómo se enchufa): [ideas/2026-09-08-tipos-molinetes.md](./ideas/2026-09-08-tipos-molinetes.md).  
Necesidades HW/SW: [19-puerta-molinete-hw-sw.md](./19-puerta-molinete-hw-sw.md).

**Forma del primer piloto (abierto):** ¿molinete físico, o `/puerta` en tablet y hardware en paralelo? Se evalúa; no bloquea el inventario de tipos (puntos 1–3).

---

## P2 — Débito automático (suscripción MP)

En código (no es tarjeta+job): Mercado Pago cobra con un **preapproval sin plan** (`pending`); Caja genera `init_point`; contrato al webhook. UI `/caja?memberId=&vista=debitos`. RN-PAG-013..016, CU-PAG-008..010.

**Pendiente:** QA en live (P9…P9j). Guía: `docs/uso/probar-debito-suscripcion-mp.md` y `local/en-testeo/probar-debito-y-asistente.md`.

Dependencia: producto Suscripciones + webhooks en la app MP del gym; [E5 MP live](./11-roadmap-mvp.md).

---

## P3 — Landing, pricing y SEO

Sitio público en el **apex** (`http://localhost:3002/` / dominio de plataforma). El Admin sigue en `{slug}.…` y no se indexa.

Este corte (en código):

- Landing: gyms, clubes y estudios; CTA a Calendar; prueba del asistente (sin datos de un gym).
- **Planes** = packs activos del tenant `admin` (`GET /public/platform/packs`).
- **Alta self-serve:** Identity → `/empezar` → preapproval MP de `admin`; el gym nace en el webhook. Caja `admin` sigue para cobro asistido y prueba 30 días (RN-PAG-017).
- SEO base: title/meta, OG, canonical, JSON-LD, `sitemap.xml`, `robots.txt`, copy en castellano.
- SEO de marca: title y H1 con “Faciliter” primero (“Faciliter Brain” queda como `alternateName`), JSON-LD `Organization` + `SoftwareApplication`, preview 1200×630 generada en el build (`app/opengraph-image.tsx`, `lib/brand-image.tsx`, Barlow Condensed en `web/assets/fonts`) e isotipo de triángulo de nodos en favicon, ícono Apple y app.
- Google Search Console: propiedad de dominio verificada por DNS TXT (fuera del código).

Todavía:

- Renovar / cambiar pack Faciliter y baja de mandato en apex (`PlanPanel` es lectura).
- `/legal/terminos` y `/legal/privacidad`: **borrador** (no es el texto final Argentina). El contrato revisado sigue en [operaciones.md](./99-backlog-post-mvp/operaciones.md).

El costo de OpenRouter (P4) alimenta el número de pricing; no al revés.

---

## P4 — Tokens y consumo OpenRouter

El asistente Admin **ya corre** (C7: abort, título, chips; smoke pendiente de probar en VPS). La burbuja de la landing **también** llama OpenRouter. OpenRouter se paga. Sin números no se puede poner el chat en un plan ni capar abuse. La landing tiene un tope por IP/hora; el tope por **staff** sigue pendiente.

Dos capas (no mezclarlas):

| Capa | Para qué |
|------|----------|
| Tope C7 | Mensajes/min o tokens/día por staff — que un loop no tumbe la cuenta. [17](./17-roadmap-chat-mcp.md) |
| Costo | Cuánto sale un gym/mes (p50/p95) para el precio de P3 |

Sin dashboard fancy: logs o suma por `tenant_id` + `user_id` alcanza para el primer número.

---

## P5 — Migración (Excel + IA)

Para un gym que **ya tiene** socios: migrar **afiliado completo** (ficha + foto de perfil + carpeta). Packs/caja/QR son de Faciliter. Excel + files; sin 700k `Transaction`. Ideación: `local/mis-tickets/ticket-migracion-gyms.md`.

**v1 en código (2026-10-01, en testeo).** Admin → Afiliados → **Importar** (`/afiliados/importar`), permiso peligroso `members.import` + `members.write`. Reglas: [RN-MIG](./04-reglas-de-negocio.md) (sección 6c). Tabla `member_imports`: [09](./09-esquema-db.md).

- **Planilla** (xlsx/csv): el navegador la lee, sugiere el mapeo por nombre de columna (corregible; queda guardado por gym), muestra la vista previa y manda lotes de 200. Sin mail → error en el CSV. Socio existente (mail, DNI o cuenta) → se omite: re-subir el archivo es idempotente.
- **Fotos y carpeta** (carpeta de la PC o zip): `fotos/{dni o email}.ext` → foto de perfil; `carpeta/{dni o email}/archivo` → carpeta del socio (10 ítems, 5 MB). Socio que ya tiene foto o carpeta → no se le carga nada (avisado como omitido).
- **Números del aparato ZKTeco** (2026-10-02, solo gyms con acceso ZKTeco): planilla DNI o mail + número del aparato → vínculo de acceso del socio, para que entre con el mismo número que ya usaba. Revisión previa con CSV; ya vinculado → omitido; de otra persona → error (RN-MIG-006).
- **Contraseña**: altas nuevas con `ChangeMe123!` marcada temporal (aviso en app y web). Quien ya tenía cuenta en otro gym conserva la suya. Vincular Google/Apple borra la temporal. “Crear contraseña” (cuentas solo Google) en app y web; “Cambiar contraseña” también en la app.
- **Sin job de fondo:** la pestaña tiene que quedar abierta durante la corrida; si se corta, se reintenta el lote o se re-sube el archivo.

Pendiente: mapeo con IA, selector de sede en la UI (la API acepta `branchId`), “olvidé mi contraseña” por mail.

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
| E7 Rutinas y resto E8 | Maestro §7 · roadmap | Rutinas plantilla y push N2 **fuera**. N1 + plantillas Admin + cron E2/E3: hecho; bandeja staff pendiente |
| Historial packs otros períodos / paginación comprobantes | [app-afiliado.md](./99-backlog-post-mvp/app-afiliado.md) | Nice-to-have del piloto, no bloquea molinete ni pricing |

### Decisiones de este corte

| # | Decisión |
|---|----------|
| 1 | E7 rutinas plantilla y push **no** en el cierre go-to-market; N1 pago+bandeja sí (2026-09-30) |
| 2 | P3 incluye **SEO** (no era “CEO”) |
| 3 | Primer piloto: molinete físico vs tablet en `/puerta` — **se evalúa** |

---

## Qué no entra (sigue post-MVP)

Tienda de mercadería, white label, AFIP, offline puerta, biometría de hardware, anti-fraude QR, fichaje horario, waitlist modos 2/3, gastos recurrentes y tope R2 de comprobantes (los gastos v1 ya están: RN-GAS), multi-sede UI, chat writes de dinero/puerta (crear/editar ya está: RN-ASI), rutinas plantilla, push N2, bandeja staff de avisos.

---

[Índice](./00-indice.md) · [Roadmap MVP](./11-roadmap-mvp.md) · [Backlog post-MVP](./99-backlog-post-mvp.md)
