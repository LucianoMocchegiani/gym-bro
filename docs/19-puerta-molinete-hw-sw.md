# Puerta / molinete — qué hace falta (hardware y software)

**Estado:** Borrador (spike P1, 2026-09-09)  
**No es** CU ni arquitectura cerrada. Necesidades para adaptar tornos existentes a GymBro.  
**Investigación:** [ideas/2026-09-08-tipos-molinetes.md](./ideas/2026-09-08-tipos-molinetes.md) · [18 P1](./18-prioridades-cierre-mvp.md) · SSI: [12](./12-acceso-quark-oid4-diseno.md)

**Regla:** un solo evaluate en Nest. Identidad = puertos. Actuador = un relé. Kuatia nativo; DNI/huella opcionales.

```text
Identidad (Kuatia | DNI | huella…)
        ▼
GymBro evaluate  (ya existe)
        ▼
Agente + nuestro relé  →  bornes OPEN del torno  →  un paso
```

---

## 1. Hardware

### 1.1 Lo que **no** compramos

El molinete (trípode / portillo / jaula) y su placa. Se reusa. El cerebro viejo (ZKAccess, Tango, GSD, firmware F22 dueño del relé) se **desenchufa** de `OPEN`.

### 1.2 Actuador GymBro (obligatorio para abrir hierro)

Cierra `OPEN` + `COM` **0,5–2 s**. No alimenta el motor (220 V). Solo el trigger que el fabricante ya espera.

| Pieza | Qué | Notas |
|--------|-----|--------|
| Módulo relé contacto seco | 1 canal (2 si entrada/salida) | NA por defecto; NC configurable. 12 V típico. USB (en tablet) o bornes en un box |
| Agente físico | Tablet con dongle USB **o** box (Pi / ESP32) al lado del torno | Misma LAN/Wi‑Fi que el gym |
| Cable | 2 hilos placa `OPEN`/`COM` (a veces `NO`/`GND`) | Foto de placa en la visita |
| Fuente | La de la tablet o 12 V del box | Independiente del motor del torno |
| Red | Wi‑Fi o Ethernet al API | Sin esto no hay evaluate online (offline = otro corte) |

**Dos montajes (mismo software de agente):**

| | Cuándo | Cómo |
|--|--------|------|
| A. Tablet + USB-relay | Verificador SSI pegado al torno | Un dispositivo: `/puerta` + pulso |
| B. Box en el torno | La tablet está en recepción, el hierro lejos | Tablet/API → agente en LAN → relé |

Pulso típico de industria: **0,5–2 s**, no buffered (un `allow` = un giro). Configurable por gym.

**Visita:** si no hay `OPEN`, este hardware no alcanza (controladora cerrada). Caso especial, no el diseño.

### 1.3 Verificador SSI (nativo, gym nuevo o el que usa app)

| Pieza | Qué | Ya tenemos |
|--------|-----|------------|
| Tablet o celular en la puerta | Pantalla + cámara no hace falta en modo B | `/puerta` muestra QR `requestUri` |
| App afiliado | Wallet escanea el QR | Flutter + Kuatia |

Modo B: el **socio** escanea. El scanner del molinete no hace falta para Kuatia.

### 1.4 Módulo DNI (opcional)

Reusar el lector que ya está.

| Pieza | Qué |
|--------|-----|
| Lector PDF417 / QR (p. ej. tipo QR-200) o pistola USB | Sigue en el torno o mostrador |
| Salida | USB teclado (el número se “tipea”) o Wiegand + conversora → el **agente** lo lee |
| Ficha GymBro | `members.document` cargado |

No es RENAPER. No validamos el plástico.

### 1.5 Huella (después, no este corte)

ZKTeco F22/MA300/etc. + USB de enrolamiento (ZK9500) + **PC en el gym**. No hay BOM GymBro de huella hasta ese módulo. El relé sigue siendo el de 1.2 (el F22 deja de dueño de `OPEN`).

### 1.6 BOM mínimo piloto (Kuatia + relé)

```text
1 × tablet (Android/Chrome) en `/puerta`
1 × USB-relay contacto seco   (o 1 box Pi/ESP + relé)
2 × cables a OPEN/COM
Internet
Torno del gym (ya instalado)
```

DNI: sumar el lector existente + documento en fichas. Huella: no en el piloto salvo que se abra ese corte.

---

## 2. Software

### 2.1 Ya está (no rehacer)

| Pieza | Dónde | Rol |
|--------|--------|-----|
| Evaluate + persistir intento | `api` `evaluateAndPersist` | Pack, deuda, reserva, multi-ingreso |
| Preview | `GET /members/:id/access-preview` | Misma decisión, sin historial |
| OID4VP modo B | `POST /access/oid4vp/request` + poll sesión | Kuatia → `memberId` |
| UI puerta | `web` `/puerta` | QR + resultado |
| Wallet | `mobile` | Escanea y presenta VP |
| Pase manual | Staff | Sin hierro |
| Documento en ficha | `members.document` | Unique por tenant |

Falta el **actuador** y, para DNI, **identidad por documento**.

### 2.2 Agente de puerta (nuevo, en el gym)

Proceso chico **fuera de Nest** (tipo Redis: no conoce afiliados). Corre en la tablet o en el box.

| Responsabilidad | Detalle |
|-------------|--------|
| Pulso | `POST /pulse` local → cierra relé `pulseMs` |
| Salud | Relé conectado, último pulso |
| Config | `OPEN` NA/NC, `pulseMs` 500–2000, no secretos de GymBro |
| Auth | Token de dispositivo o solo LAN; no el JWT Staff en el relé |

No evalúa deuda. Si GymBro dijo deny, no pulsa.

Sugerencia de repo (al codear): `gate-agent/` o servicio en el box. No meter GPIO en `api/`.

### 2.3 API GymBro (a sumar)

| Necesidad | Corte | Notas |
|----------|-------|--------|
| Tras `allow` en OID4VP / preview, disparar pulso | P1 | `/puerta` llama al agente (URL LAN configurable) **o** el agente poll-ea la sesión |
| Identidad por DNI | Módulo DNI | `document` → member → evaluate → (opcional) persistir intento. Hoy preview pide `memberId` |
| Config tenant | Canales | `kuatia` / `dni` / ambos. Huella después |
| Intento | Motivo + canal | `scan_mode` / método: `oid4vp` \| `dni` \| `manual` \| luego `fingerprint` |

Un evaluate. Varios *quién*. Un pulso.

### 2.4 Front

| Superficie | Cambio |
|------------|--------|
| `/puerta` | Si hay agente configurado y resultado allow → pedir pulso. Deny → no |
| Config gym | URL del agente, canales de identidad, `pulseMs` |
| DNI | Pantalla o agente leyendo HID: mostrar allow/deny (opcional; el relé basta) |

### 2.5 Módulos de identidad (producto)

| Canal | Software nuestro | Hardware | Estado |
|--------|-------------------|----------|--------|
| **Kuatia** | Ya: OID4VP + app | Tablet | Nativo. Siempre en el producto; el gym puede usarlo o no en la puerta |
| **DNI** | Lookup + evaluate | Scanner existente + agente HID/Wiegand | Opcional. Sin SDK |
| **Huella** | Bridge PC (no Nest) | ZKTeco + enrolamiento | Después. SDK fuera de `api/` |

Kuatia no se “apaga”. Un gym DNI puede igual tener app para el que no trajo documento.

### 2.6 Qué no va en Nest

- GPIO / USB-relay
- Pull/Push SDK ZKTeco
- Wiegand en el server (el agente en el gym traduce)
- Driver por modelo de torno (TS1000 vs FHT2300)

---

## 3. Cortes de entrega

| # | Entrega | HW | SW |
|---|---------|----|----|
| **P1a** | Abre el hierro con SSI | Tablet + USB-relay o box | Agente pulso + `/puerta` allow→pulse |
| **P1b** | Gyms con scanner DNI | Lector existente | Lookup `document` + mismo agente |
| **P1c** | Huella | Equipo ZK + PC | Bridge; relé sigue siendo P1a |

P1a cubre la mayoría de **tornos**. P1b cubre la mayoría de **lectores DNI**. P1c es el lock-in; no bloquea el resto.

---

## 4. Fuera

Offline puerta, modo A (gym escanea holder) como dependiente de SSI, anti-fraude QR, fichaje horario, biometría en nuestra DB, SDK de marca en `api/`.

---

## 5. Siguiente

1. Elegir montaje A (tablet+USB) vs B (box) para el primer piloto.
2. Foto `OPEN` en un torno real.
3. Método de producto (RN/CU) **antes** de codear el agente.
4. No abrir huella hasta que P1a esté en un gym.

[Índice](./00-indice.md) · [Prioridades](./18-prioridades-cierre-mvp.md) · [Idea molinetes](./ideas/2026-09-08-tipos-molinetes.md)
