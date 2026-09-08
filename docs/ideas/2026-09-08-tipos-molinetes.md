# Tipos de molinete (inventario para P1)

**Fecha:** 2026-09-08  
**Fuente:** guías de hardware gym 2026 (FitNova, PSD, ZKTeco AR) + integración estándar dry-contact / Wiegand  
**Estado:** revisada  
**Tema:** acceso  
**Relacionado:** [18 P1](../18-prioridades-cierre-mvp.md) · [acceso.md](../99-backlog-post-mvp/acceso.md)

No es CU ni arquitectura cerrada. Sirve para evaluar; el vendor se elige después con el [método](../10-metodo-definicion-producto.md).

---

## Lo bueno (resumen)

Hay **tres formas físicas** que cubren casi todos los gyms, más un cuarto caso “sin torno”:

| Forma | Qué es | Dónde se ve | Seguridad física | Accesible silla |
|-------|--------|-------------|------------------|-----------------|
| **Trípode** | 3 brazos a la cintura, 1 persona por giro | Independiente / low-cost (el más común) | Media (se puede saltar) | No (hace falta puerta al lado) |
| **Portillo / speed gate** | Hojas de vidrio o metal que se abren | Boutique / premium / mucho flujo | Media (anti-colado según sensores) | Sí (carril ancho) |
| **Altura completa** | Jaula ~2 m, 3 aspas de piso a techo | 24h sin staff, exterior | Muy alta | No (puerta al lado) |
| **Cerradura / tablet** | Electroimán o tablet en `/puerta` | Estudio chico (<~150 socios) | Baja-media | Sí |

Marca habitual en Argentina para trípode: **ZKTeco** (TS1000 Plus vertical, TS2000 Plus/Pro tipo puente). Hikvision y similares en altura completa. No hace falta atarse a una.

### Cómo se enchufa de verdad (esto es lo que nos importa)

El torno **no habla de socios**. Hay dos circuitos distintos:

```text
Credencial (QR / RFID / cara / celular)
        │  Wiegand, RS-485 o HTTP
        ▼
Controladora / software (GymBro decide allow/deny)
        │  contacto seco 0,5–2 s (COM + NA)
        ▼
Placa del molinete (OPEN) → un giro / abrir hojas
        │  a veces “passage confirmed”
        ▼
Opcional: pulso de giro de vuelta al software (conteo)
```

| Interfaz | Rol | ¿GymBro v1? |
|---------|-----|-------------|
| **Contacto seco (relé)** | “Abrí una vez” | **Sí — el contrato universal.** Casi todas las placas tienen OPEN/GND |
| **Wiegand** | Lector de tarjeta → controladora (bits del badge) | No como salida nuestra. Es del lector, no del software |
| **RS-485 / SDK TCP** | Status, anti-passback, vendor | Evitar en v1 (atado a ZKTeco/Hikvision) |
| **HTTP del lector QR** | El lector pega a una URL | Encaja si el QR es nuestro o un one-shot |

Credenciales típicas en gym: RFID (todavía muy usado), QR de app, NFC, cara. GymBro hoy: **OID4VP en el celular** (el socio escanea el QR de `/puerta`). El molinete suele ser al revés: **el equipo lee** QR/RFID.

---

## Implicancias para GymBro

Hoy: evaluación ya existe (`oid4vp` + `access-preview` + pase manual). Falta un **adapter de actuador**: `allow` → pulso.

Tres formas de piloto (la 3 sigue abierta):

| Camino | Qué hace el gym | Qué codeamos |
|--------|-----------------|--------------|
| A. Tablet | `/puerta` como ahora; staff o totem | Casi nada de hardware |
| B. Relé | Box en el torno: HTTP/GPIO → relé 0,5–2 s | Adapter chico + `allow` ya existente |
| C. Lector en el torno | QR/RFID en el equipo llama a GymBro | Endpoint “abrir si esta credencial vale” (hoy el VP vive en el celular) |

Recomendación de spike: **B cubre trípode, portillo y altura completa** (misma placa OPEN). A sirve para el primer gym si todavía no hay torno. C es el salto de producto (credencial en el molinete, no en el teléfono).

No mezclar: biometría, offline, Wiegand como protocolo nuestro, SDK ZKTeco.

---

## No hacer / evitar

- Elegir marca antes de fijar el contrato `allow` → relé.
- Implementar Wiegand o Push SDK de un vendor en v1.
- Instalar solo trípode y olvidar **puerta accesible + incendio** (el brazo tiene que caer o haber salida).
- QR estático en el molinete (se comparte; el diseño SSI actual evita eso en el celular).

---

## Siguiente paso sugerido

- [x] Anotar inventario (este archivo)
- [ ] Elegir camino A / B / C para el primer piloto (sigue “se evalúa” en [18](../18-prioridades-cierre-mvp.md))
- [ ] Sesión de definición (método producto) **antes** de codear un vendor

Fuentes: [FitNova 2026](https://www.fitnova.eu/blog/torniquetes-portillos-molinetes-gimnasio) · [ZKTeco AR peatonal](https://www.zkteco.com.ar/tecnologia-entrada-peatonal/) · [dry contact](https://www.pengrongdoors.com/news/how-dry-contact-signals-control-a-tripod-turnstile-gate.html)
