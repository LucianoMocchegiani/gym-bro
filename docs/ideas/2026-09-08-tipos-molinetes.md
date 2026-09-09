# Tipos de molinete (inventario para P1)

**Fecha:** 2026-09-08 · actualizado 2026-09-09  
**Fuente:** GymFlow/ZKTeco AR, Intelektron QR-200 (DNI PDF417), Crossfy GSD/Tango, dry-contact  
**Estado:** revisada  
**Tema:** acceso  
**Relacionado:** [18 P1](../18-prioridades-cierre-mvp.md) · [19 HW/SW](../19-puerta-molinete-hw-sw.md) · [acceso.md](../99-backlog-post-mvp/acceso.md)

No es CU ni arquitectura cerrada. Pregunta de producto: **cómo se abre un torno ya instalado** para no tirarlo cuando el gym migra a GymBro.

---

## Cómo funciona (tres capas)

Lo que se ve en la calle (huella vs DNI) **no es el molinete**. Es el **lector**. El hierro es otra cosa.

```text
1. IDENTIDAD     huella | DNI | RFID | QR | celular SSI
        │  “quién es”
        ▼
2. CEREBRO       software viejo / ZKAccess / bridge / GymBro
        │  “¿puede entrar?”  (pack, deuda, reserva…)
        ▼
3. ACTUADOR      contacto seco 0,5–2 s en bornes OPEN / COM
        │
        ▼
4. HIERRO        trípode, portillo, altura completa, electroimán
```

**Casi todos los tornos se abren igual:** un relé cierra un circuito un instante. Huella y DNI solo cambian el paso 1.

En Argentina el pack típico es **ZKTeco** (F22, MA300, K40, SpeedFace) atornillado al trípode: el mismo gabinete suele traer lector + relé. El software de gym (o ZKAccess) es el que manda el pulso.

---

## Lo que viste en tu zona

### Huella

1. Socio apoya el dedo.
2. El equipo (o una PC con “bridge”) compara contra huellas enroladas.
3. Si hay match, el **cerebro** pregunta si la cuota está al día.
4. Relé → el trípode gira una vez.

Las huellas **no viven en GymBro hoy**. Viven en el reloj ZKTeco o en el software viejo. Migrar “el dedo” implica re-enrolar o un SDK ZKTeco (Pull/Push): caro y atado a marca. Competidores AR (GymFlow) ponen un **Access Bridge en la PC del gym**.

PIN en el teclado del mismo equipo = a menudo el **DNI tipeado**, no un scanner.

### “Scan con el DNI”

Casi nunca es RENAPER. Es un **lector de código** que lee el **PDF417 del dorso** del DNI argentino (a veces también QR de la app). Ejemplo: Intelektron QR-200 → conversora → **Wiegand** hacia la controladora. Otros salen por USB como teclado y “tipean” el número.

El cerebro recibe un **número de documento** y busca al socio. Si en ficha no hay DNI, este camino no sirve hasta cargarlo.

DNI se **presta** (a diferencia de la huella). Es más fácil de integrar (un string) y más débil contra fraude.

---

## Cómo se abre de verdad (la mayoría)

| Señal | Qué es | Para migrar |
|-------|--------|-------------|
| **Contacto seco (relé)** | 2 cables: COM + NA, pulso corto | **Universal.** Pedirle al electricista “bornes OPEN del torno”. |
| **Wiegand** | El lector manda bits de ID a una controladora | El lector viejo puede seguir; el cerebro nuevo interpreta el ID |
| **USB teclado** | El DNI “se escribe” en una PC | Un agente en la PC lee el número y llama a GymBro |
| **SDK / software del fabricante** | ZKAccess, Tango, GSD, etc. | Evitar como v1 nuestra. Es el lock-in del sistema viejo |
| **Agente en PC del gym** | Crossfy Tango, GymFlow Bridge | Patrón común en AR: la nube no habla Wiegand |

El hierro (trípode vs jaula) **no hay que cambiarlo** si encontramos OPEN.

---

## Migrar un gym que ya tiene torno

Objetivo: **no comprar otro molinete**. Cambiar el cerebro.

```text
Antes:  lector (huella/DNI) → software viejo → relé → torno
Después: lector (si se puede reusar) → GymBro → mismo relé → mismo torno
```

Checklist en la visita:

1. Foto de la placa: ¿hay bornes `OPEN`, `COM`, `NO`, `GND`?
2. ¿El lector es ZKTeco (huella), pistola/QR de DNI, RFID, o todo-en-uno?
3. ¿Quién dispara el relé hoy? (el propio F22, una PC, una caja GSD/Tango)
4. ¿Los socios tienen DNI en ficha?

### Compatibilidad “con la mayoría”

No son tres productos distintos. Es **una pila**: el relé siempre; DNI y huella son *quién es*.

```text
Huella (después) ─┐
DNI (si hay scanner)─┼─► GymBro: ¿puede entrar? ─► RELÉ ─► mismo hierro
App / tablet SSI ─┘
```

#### Qué construimos vs qué se reusa

Las tres lecturas (tablet, “sacar el relé”, adapter por marca) se ordenan así:

| Pieza | ¿Nuestra? | Qué es |
|--------|-----------|--------|
| Hierro (brazos, motor) | No | Se queda |
| Bornes `OPEN`/`COM` de **su** placa | No | El relé **del torno**. No se saca; se **reconecta** |
| Cerebro viejo (ZKTeco, Tango, GSD…) | Se **desenchufa** de `OPEN` | Deja de decidir |
| Agente + módulo relé (box o USB en la tablet) | **Sí** | Cierra esos bornes 0,5–2 s cuando GymBro dice allow |
| Tablet / celular verificador | **Sí** (casi ya existe: `/puerta`) | Identidad SSI modo B |
| Adapter SDK por marca | No en v1 | Solo si no hay `OPEN` |

```text
[Tablet /puerta]  o  [scanner DNI]
        │ internet
        ▼
    GymBro (evaluate) ── allow ──► [box nuestro]
                                        │ 2 cables
                                        ▼
                              placa del TORNO (OPEN)
                                        │
                                        ▼
                                    un giro
```

1. **Tablet como verificador + relé** — Sí. Es el camino SSI. La tablet **no** reemplaza el motor. Cuando hay `allow`, un USB-relay o un box al lado pega el pulso. `/puerta` ya es el verificador; falta el “si permito, abrí”.
2. **¿Sacar el relé y poner algo nuestro?** — No el del torno. Ese es el interruptor del fabricante. Ponemos **otro** relé (el nuestro) **cableado a** esos bornes. El viejo software deja de usarlos.
3. **¿Cada molinete trae sistema y hacemos un adapter por marca?** — Traen *su* software (ZKAccess, etc.). Si hablamos SDK con cada uno, no hay “mayoría”. El adapter universal es: **GymBro + bornes OPEN**. Adapter ZKTeco/Hikvision = excepción, no el diseño.

Un solo agente cubre trípodes distintos mientras la placa tenga `OPEN`.

---

#### 1) Relé — “foto de la placa y listo”

**Qué es.** Un relé es un interruptor eléctrico. La placa del torno tiene bornes típicos `OPEN` + `COM` (a veces `NO` / `GND`). Si cerrás esos dos cables **medio segundo**, el motor da **un** giro (trípode), abre las hojas (portillo) o gira la jaula. El hierro no sabe si fue huella, DNI o un botón.

Por eso cubre trípode, portillo y jaula: **el actuador es el mismo**. Cambia el mueble, no el cable.

**Qué se hace en el gym.**

1. Abrir la tapa del torno (o la caja al lado).
2. Foto de la placa y del manual si está.
3. Ubicar `OPEN` / `COM` (a veces etiquetado “unlock”, “trigger”, “in”).
4. **Desconectar** el cable que hoy manda el software viejo o el ZKTeco.
5. Conectar **nuestro** relé (un box/Raspberry/PC con un módulo de relé de 12 V, o un USB-relay).
6. Internet en esa PC/box (Wi‑Fi del gym alcanza).

No hace falta el SDK de ZKTeco ni el modelo del torno. Si los bornes existen, el hierro se reusa.

**Qué codeamos.** Un agente chico **en el gym** (no en el server):

```text
GymBro dice allow  →  el box cierra el relé 0,5–2 s  →  el socio pasa
GymBro dice deny   →  no hay pulso (buzzer opcional)
```

Hoy la decisión **ya existe** (`access-preview` / OID4VP / pase manual). Falta solo el actuador. El socio se identifica como ahora: **app (SSI)** o tablet en `/puerta`. El torno abre porque el staff/totem confirma, no porque el torno “entienda” GymBro.

**Límite.** El relé **no identifica**. Si el gym quiere seguir poniendo el dedo o el DNI **sin** celular, hace falta el paso 2 o 3. Relé solo = “GymBro manda abrir”.

**Visita de 10 minutos.** Si no hay `OPEN` (placa muerta, torno 100 % mecánico, o todo cerrado en un firmware sin bornes), ese gym **no** se migra con un cable: hay que cambiar controladora o el torno. Eso se ve en la foto.

---

#### 2) DNI — el número entra a GymBro, sin SDK

**Qué es.** Encima del relé. El scanner **ya instalado** dice *quién* es; GymBro decide *si entra*; el relé del punto 1 abre.

El lector no habla con ZKTeco. Tira un **texto**: el número de documento (dorso PDF417, pistola USB que “tipea” como teclado, o Wiegand con una conversora).

En GymBro el afiliado ya tiene `members.document` (único por gym). Flujo:

```text
Scanner lee DNI
  → “20345678” (o el PDF417 parseado)
  → buscamos Member por tenant + document
  → misma evaluación de puerta (pack, deuda, reserva…)
  → allow → relé
  → deny → no abre + motivo (igual que /puerta)
```

**Por qué sin SDK.** No hay huella ni firmware ZK. Es un string + un GET/POST nuestro. El agente en la PC:

- si el lector es **USB teclado**: se “escribe” el DNI en el agente;
- si es **Wiegand**: una placa intermedia convierte a número y el agente lo lee;
- si es **Ethernet/HTTP** (algunos QR industriales): el lector pega a nuestra URL.

Ninguno pide librería de fabricante.

**Hay que tener.** Documento cargado en la ficha. Si el gym nunca lo cargó, el scan no mata a nadie. También normalizar (puntos, `CUIL` vs DNI). El DNI **se presta**: no es anti-fraude; es identificación barata.

**Hoy en código.** Preview pide `memberId`, no DNI. El lookup `document → id` es el único hueco (más persistir el intento como en puerta). El relé sigue siendo el mismo box.

**Qué no es.** No consultamos RENAPER. No validamos que el plástico sea auténtico. Es “este número está en la ficha y tiene pack”.

---

#### 3) Huella — después, lock-in ZKTeco

**Qué es.** El lector **es** el producto ZKTeco (F22, MA300, …). Las huellas están **adentro del reloj** (o en ZKAccess). El equipo a menudo decide solo: match local → **su** relé. El software de gym a veces ni se entera, o se entera después por logs.

Para que **GymBro** decida (deuda, pack) hay que **romper** ese circuito:

```text
Hoy:    dedo → ZKTeco (match + “¿horario?”) → relé del propio equipo
Queremos: dedo → (¿quién es?) → GymBro → nuestro relé
```

**Por qué es lock-in.**

| Problema | Detalle |
|---------|---------|
| SDK | Pull SDK mal documentado; Push SDK **privado** de ZKTeco. Cada modelo (F22 vs inBio) no es el mismo API. |
| Templates | No es una foto. Es un blob del fabricante. No sirve en Hikvision ni en un F22 de otra serie sin re-enrolar. |
| Enrolamiento | Lector USB en mostrador (ZK9500) + software. Migrar = **todos los socios vuelven a apoyar el dedo**. |
| Quién dispara el relé | Si el F22 sigue dueño del relé, GymBro no puede negar por deuda. Hay que pasar el relé a nuestro box (punto 1) **y** que el F22 solo avise “user 42 matcheó”. |
| Offline | El reloj abre sin internet con su lista interna. Esa lista **no** es nuestra regla de negocio. |

Por eso “después”: no es que la huella sea mala (es la mejor contra “préstamo”). Es que **no es compatible con la mayoría**: solo con *ese* stack ZKTeco + re-enrolar. Relé + DNI cubren más gyms con menos código.

**Si un piloto grande la exige.** Mismo patrón que GymFlow: agente Windows, matching en PC o eventos del reloj, GymBro decide, **nuestro** relé. Un corte aparte, no el adapter universal.

---

Orden: **relé** (abrimos el hierro) → **DNI** (reusamos el scanner) → **huella** (solo si el gym no suelta el dedo).

Patrón de competidores: GSD (cloud) o Tango/GymFlow (**agente en PC**). GymBro: box en el gym; el server no habla Wiegand.

---

## Formas del hierro (secundario)

| Forma | Dónde se ve |
|-------|-------------|
| Trípode | Independiente / low-cost (el más común; ZKTeco TS1000/TS2000) |
| Portillo / speed gate | Boutique |
| Altura completa | 24h |
| Electroimán / tablet | Estudio chico |

Mismo relé. No define la migración.

---

## ¿El scanner se acopla al SSI (verificador escanea al holder)?

**Corto:** el **protocolo** sí está pensado (modo A, pendiente). El **lector de DNI/QR del torno no es el verifier de Kuatia**. Puede ser una cámara tonta que manda un string; OID4VP lo termina GymBro + wallet.

Hoy implementado es **modo B** (al revés):

```text
/puerta muestra QR = requestUri OID4VP
  → el celular del socio ESCANEA
  → la wallet habla con Kuatia y manda el vp_token
  → GymBro poll → memberId → evaluate
```

**Modo A** (gym escanea al afiliado) está en CU-ACC-001, wireframe §12 y backlog. La app **no** muestra todavía un QR para que el gym lo lea. El SD-JWT de la VC **no entra** en un QR de molinete (es grande). Habría que mostrar un código corto (URL / one-shot) y que el backend arme el OID4VP. Eso no está.

### Qué puede y qué no el scanner industrial (tipo QR-200)

| | DNI (PDF417) | QR de la app SSI |
|--|----------------|------------------|
| El hardware | Lee el dorso y tira un número | Puede leer un QR **chico** de la pantalla |
| Habla Kuatia / `vp_token` | No | No |
| Encaje | Lookup `document` → evaluate → relé | Solo si el QR es un token corto que GymBro entiende |

El scanner **no** sustituye a `/puerta`. Es un teclado/Wiegand. Un agente toma el texto y llama a nuestra API. Sin agente, el torno no es “verifier OID4VP”.

### Dos formas de SSI + relé (no mezclar)

**1) Modo B + pantalla en el torno (el que ya tenemos)**  
Una tablet o un display muestra el mismo QR de `/puerta`. El socio escanea con la app. `allow` → relé. **No hace falta** el scanner del molinete ni modo A. Es el acoplamiento SSI más barato.

**2) Modo A + scanner/cámara (pendiente)**  
El socio abre la app y **muestra** un QR. El lector del torno (o una cámara USB) lo lee. El agente manda el payload a GymBro. Hace falta: UI “mostrar credencial”, QR corto (no el VP entero), y el corte de backlog. Un Intelektron sirve si el QR es simple; una tablet de `/puerta` al revés (cámara) es más realista para SSI.

Mismo relé en los dos. El scanner de DNI **no** se “convierte” en Kuatia. A lo sumo: **un lector, dos payloads** (PDF417 = DNI; QR chico = SSI modo A).

Modo A sigue **fuera** del corte de cierre P1 ([18](../18-prioridades-cierre-mvp.md)); P1 es relé ± DNI. SSI en el torno = modo B + pantalla, sin esperar modo A.

---

## Nativo Kuatia + identidad adaptativa (opinión)

No es quilombo **si** hay un solo núcleo de decisión y el resto son *puertos*. Sí lo es si Nest habla SDK ZKTeco + Hikvision + Tango.

GymBro **ya** evalúa en un solo lugar (`evaluateAndPersist`). Falta: (1) pulso, (2) “quién es” por canal.

```text
                    ┌─ Kuatia / SSI     (nativo, gym nuevo o el que quiere app)
Identidad ─────────┼─ DNI / PDF417     (módulo: string → member.document)
                    └─ Huella ZKTeco    (módulo después: bridge, no Nest)

                         ▼
              GymBro evaluate (uno solo)
                         ▼
              Actuador: nuestro relé → OPEN del torno
```

Config por gym (idea): `identity = kuatia | dni | kuatia+dni` y más adelante `fingerprint`. Kuatia **no se apaga** del producto: queda nativo; el gym elige qué canal usa en la puerta. Varios canales a la vez (huella en hora pico, app si olvidó el DNI) es razonable; todos caen al mismo evaluate.

### Cómo es “nuestro relé” (para la mayoría)

No es un torno GymBro. Es un **módulo de contacto seco** + un agente:

- Hardware: USB-relay (en la tablet) o box (ESP32/Pi + relé 12 V) al lado del molinete.
- 2 cables a `OPEN`/`COM`. Pulso **0,5–2 s**, normalmente NA (configurable).
- **No** mandamos 220 V al motor. Solo el *trigger* que el fabricante ya espera.
- La tablet llama `allow` en la API y luego “pulse” al agente local (o el agente está en la misma tablet).

Por qué cubre la mayoría: el estándar de industria es exactamente ese trigger. Marca y forma del hierro no importan. Quilombo solo si la placa no expone `OPEN` (firmware cerrado): ese gym es caso especial, no el diseño.

### DNI y huella como módulos (no adapters por cada torno)

| Módulo | Qué hace | Quilombo |
|--------|---------|----------|
| **Actuador relé** | Pulso. 1 dispositivo para todos los tornos con OPEN | Bajo. P1. |
| **DNI** | Scanner USB/Wiegand → número → ficha → evaluate → mismo relé | Medio-bajo. Un endpoint. Sin SDK. |
| **Huella** | Bridge en PC del gym (estilo GymFlow). Templates/SDK ZK **fuera** de Nest | Alto. Otro corte. |

El módulo nuevo es **identidad → memberId**. No un “driver TS2000” y otro “driver F22”.

### ¿Mucho quilombo?

| Hacer | No hacer |
|-------|----------|
| 1 evaluate, N lecturas, 1 relé | Driver por marca de molinete |
| Kuatia nativo + DNI/huella opcionales | Que ZKTeco decida la deuda |
| Huella en un bridge, no en `api/` | Push SDK dentro de Nest |

Opinión: **sí se puede y es el diseño correcto.** Orden: relé + tablet Kuatia (mata hierro) → módulo DNI (mata el scanner que ya tienen) → huella cuando un piloto grande no suelte el dedo. Tres productos en el brochure; un solo evaluate.

---

## Implicancias para GymBro

Hoy: `oid4vp` + `access-preview` + pase manual. Falta **actuador** (`allow` → pulso) y, para DNI, **resolver socio por documento**.

Huella y SSI no se pisan: la app sigue; el torno viejo puede seguir identificando por DNI o, en un segundo corte, huella.

---

## No hacer / evitar

- Tirar el trípode porque “no es GymBro”.
- Implementar Push SDK ZKTeco en el primer corte.
- Guardar fotos de huellas en nuestra DB (template sí; foto no; y ni eso en v1).
- QR estático / DNI sin ficha.

---

## Siguiente paso sugerido

- [x] Inventario de formas
- [x] Inventario de **cómo se abre** (este corte)
- [ ] En un gym real: foto de placa OPEN + tipo de lector
- [ ] Decidir: primer piloto solo relé+app, o también DNI
- [ ] Método de producto antes de codear vendor

Fuentes: [GymFlow huella+bridge](https://www.gymflow.com.ar/blog/control-acceso-biometrico-gimnasio.html) · [Intelektron QR-200 DNI](https://www.intelektron.com.ar/Descargas/productos/Soluciones/MolinetesPasarelas/MP-Accesorios/qr-200/Ficha%20T%C3%A9cnica.pdf) · [Crossfy GSD/Tango](https://www.crossfyapp.com/ayuda/integracion-molinetes)
