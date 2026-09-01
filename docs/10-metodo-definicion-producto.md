# Método de definición de producto (preguntas → decisiones → docs)

**Para qué sirve:** repetir el mismo proceso que usamos para el MVP cuando agreguemos módulos **post-MVP** o rediseñemos un área, sin reinventar el flujo ni perder decisiones.

**Entrada típica:** `@docs/00-indice.md` + `@docs/99-backlog-post-mvp.md` + este archivo + el ítem a definir.

---

## 1. Principios

1. **Primero decisiones, después documentos.** No escribir CU/arquitectura con supuestos no confirmados.
2. **Un bloque a la vez.** No mezclar pagos + rutinas + notificaciones en la misma ronda de preguntas.
3. **Opciones concretas.** Preguntas con A/B/C o tablas; el humano elige y aclara.
4. **Ampliar solo lo pedido.** Si dice “dame más detalle en X”, explicar y repreguntar esa X.
5. **Cerrar en tablas.** Toda respuesta se consolida en Decisión → Valor.
6. **Post-MVP explícito.** Lo que no entra se anota en `99-backlog-post-mvp.md` y el markdown del módulo en `99-backlog-post-mvp/` (no se olvida ni se cuela al alcance).
7. **IDs estables.** Reglas `RN-*`, casos `CU-*`; no reutilizar IDs con otro significado.
8. **Doc C-producto** (salvo que pidan otro nivel): maestro/alcance → glosario → dominio → reglas → CU → arquitectura → wireframes ASCII → pruebas **manuales** (sin tests de código como entregable de producto).

---

## 2. Fases del método

| Fase | Qué hace el agente | Qué hace el humano |
|------|--------------------|--------------------|
| 0. Contexto | Lee índice, maestro, backlog, docs del módulo tocado | Indica el ítem post-MVP o el problema |
| 1. Alcance | Pregunta: ¿entra ahora? ¿dependencias? ¿qué queda afuera? | Confirma in/out |
| 2. Craneo | Preguntas numeradas del bloque (negocio) | Responde; pide detalle si hace falta |
| 3. Cierre parcial | Resume tabla de decisiones del bloque | Corrige |
| 4. Siguiente bloque | Solo cuando el anterior está cerrado | “Seguí” / responde el nuevo bloque |
| 5. Escritura | Actualiza/crea markdown según mapa de archivos | Revisa |
| 6. Trazabilidad | Enlaza RN/CU nuevos; mueve ítem del backlog (Hecho / En diseño) | Aprueba |

---

## 3. Mapa de archivos a tocar

Al definir un **módulo nuevo** post-MVP, en este orden:

1. `99-backlog-post-mvp.md` + el md del módulo — marcar “En diseño” / sacar ambigüedad  
2. `01-documento-maestro.md` — sección módulos / roadmap (qué entra en esta entrega)  
3. `02-glosario.md` — términos nuevos  
4. `03-modelo-dominio.md` — entidades  
5. `04-reglas-de-negocio.md` — `RN-XXX-nnn` nuevos  
6. `05-casos-de-uso/<modulo>.md` — CU densos  
7. `06-arquitectura.md` — impacto (adapters, eventos, APIs)  
8. `07-wireframes-ascii.md` — pantallas nuevas  
9. `08-casos-prueba-manuales.md` — checklist manual  
10. `00-indice.md` — estado del doc  

Si el cambio es chico (una regla), puede bastar reglas + CU + pruebas + nota en backlog.

---

## 4. Plantilla de pregunta (por bloque)

```text
## Bloque N — {Nombre}

Contexto en 3–5 líneas (qué ya está cerrado en MVP).

### Decisiones (respondé N.1 → N.k)
N.1 … (opciones A/B/C si aplica)
N.2 …
…

### Post-MVP de este bloque (borrador)
- ítems que ya huele a “después”
```

Después de las respuestas:

```text
### Cerrado
| # | Decisión |
|---|----------|
| N.1 | … |

Siguiente bloque: …
```

---

## 5. Prompt listo para copiar/pegar

Usá esto en un chat nuevo (ajustá la línea del ÍTEM):

```text
Leé y seguí el método de @docs/10-metodo-definicion-producto.md

Contexto obligatorio:
- @docs/00-indice.md
- @docs/01-documento-maestro.md
- @docs/99-backlog-post-mvp.md
(y los docs del área si ya existen)

ÍTEM A DEFINIR:
{pegar el ítem del backlog, ej. "Tienda / e-commerce" o "Notificaciones N2 Push"}

Reglas de esta sesión:
1. No asumas decisiones de negocio: preguntame.
2. Trabajamos bloque a bloque; un bloque por mensaje hasta que yo cierre.
3. Si algo es ambiguo, dame opciones A/B/C y tu recomendación breve.
4. Todo lo que diferamos va al markdown del módulo en `docs/99-backlog-post-mvp/`.
5. Cuando yo diga "escribí la doc" o cerremos todos los bloques, actualizá los markdown del mapa (glosario → dominio → reglas → CU → arquitectura → wireframes → pruebas manuales) con IDs RN-/CU- nuevos.
6. Idioma: español. Nombre producto: GymBro (provisorio).
7. Nivel: C-producto (casos de uso densos; pruebas manuales, no tests de código).
8. Equipo: 1 dev + socio negocio; preferir módulos chicos entregables.

Empezá por la Fase 1 (alcance in/out) con preguntas numeradas. Todavía no escribas archivos hasta que lo pida o cerremos el craneo.
```

Variante corta si ya están alineados:

```text
@docs/10-metodo-definicion-producto.md + backlog.
Definamos post-MVP: "{ÍTEM}".
Preguntame por bloques; no codees ni escribas docs hasta que diga "escribí la doc".
```

---

## 6. Checklist de calidad antes de dar por cerrado un módulo

- [ ] In/out explícito vs MVP y vs resto del backlog  
- [ ] Glosario sin sinónimos conflictivos  
- [ ] Entidades nuevas en dominio  
- [ ] Reglas con ID y excepciones  
- [ ] CU con actor, precondiciones, flujo, errores, postcondiciones, RN-*  
- [ ] Arquitectura: puertos/adapters/APIs impactadas  
- [ ] Wireframe ASCII de pantallas nuevas  
- [ ] Pruebas manuales citando RN/CU  
- [ ] Backlog actualizado  

---

## 7. Ejemplo de ítems post-MVP para volver a correr el método

- Tienda / e-commerce  
- White label  
- Notificaciones WhatsApp / Push (N2)  
- AFIP  
- Offline en puerta  
- Catálogo global de ejercicios  
- Multi-sede completa en UI  
- Credencial SSI por pack (enfoque A/C)  

Cada uno = una sesión (o más) con el prompt de la sección 5.

---

[Índice](./00-indice.md) · [Siguiente: Backlog post-MVP →](./99-backlog-post-mvp.md)
