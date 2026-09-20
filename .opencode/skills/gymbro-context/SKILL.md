# Contexto de GymBro (hook / router)

`gymbro-context` es el **punto de entrada**. No solo lee docs: contextualiza y **elige qué otras skills aplicar** según la tarea.

## Cuando el usuario dice “usá gymbro-context para …”

1. **Contextualizar** (abajo).
2. **Elegir skills** con la tabla de ruteo.
3. **Leer y seguir** cada skill elegida (`Read` de su `SKILL.md`).
4. Decir en una línea qué skills activaste y por qué.
5. Ejecutar el flujo de esas skills (p. ej. si hay `work-on-task`, preguntar y esperar OK antes de codear).

Si el usuario nombra skills extra (`@nestjs-standards`, etc.), **sumalas** a las que elijas.

---

## 1. Contextualizar (obligatorio)

1. Lee `README.md`.
2. Lee `docs/00-indice.md`.
3. Identifica el área de la tarea y lee **solo** los docs relacionados (mapa abajo).
4. Resume en breve:
   - objetivo entendido;
   - RN / CU aplicables;
   - qué está in/out del MVP para esta tarea.

No leas toda la documentación sin necesidad.

### Mapa de docs

| Tema | Documentos mínimos |
|------|--------------------|
| Alcance / negocio | `01-documento-maestro.md`, `99-backlog-post-mvp.md` |
| Entidades / datos | `02-glosario.md`, `03-modelo-dominio.md`, `09-esquema-db.md` (tablas reales) |
| Reglas | `04-reglas-de-negocio.md` |
| Flujo funcional | archivo en `05-casos-de-uso/` |
| Técnico | `06-arquitectura.md`, `09-esquema-db.md` si toca persistencia |
| UI | `07-wireframes-ascii.md` |
| QA manual | `08-casos-prueba-manuales.md` |
| Plan | `11-roadmap-mvp.md` |
| Ideas post-MVP | `ideas/` solo si aplica |

### Fuente de verdad

1. Regla / CU específico → 2. Maestro → 3. Arquitectura → 4. Ideas (no normativas).  
Señala contradicciones; no inventes.

---

## 2. Ruteo de skills

Elige **todas** las que apliquen (pueden ser varias).

| Situación | Skills a aplicar |
|-----------|------------------|
| Implementar / empezar una tarea o épica del roadmap | `work-on-task` (+ técnicas según capa) |
| Código / API NestJS, dominio, pagos, auth, jobs | `nestjs-standards` |
| Panel Admin / Super Admin / Next.js | `nextjs-standards` |
| App Flutter, QR, afiliado móvil | `flutter-standards` |
| Cambio de alcance, APIs, stack, estructura del repo | `sync-project-docs` |
| Tarea ya terminada y verificada | `sync-project-docs` + `record-completed-task` |
| Solo lectura / explicación de docs | ninguna extra (solo contexto) |
| Definir módulo post-MVP / decisiones de producto | docs + método en `10-metodo-definicion-producto.md` (sin codear salvo que pidan) |

### Combinaciones típicas

```text
“Implementá X del roadmap”
  → gymbro-context + work-on-task
  → + nestjs / nextjs / flutter según capa
  → al cerrar: sync-project-docs + record-completed-task

“Explicame créditos / packs”
  → gymbro-context (solo docs)

“Arreglá el endpoint de pagos”
  → gymbro-context + nestjs-standards
  → work-on-task si hay decisiones abiertas
```

### Paths de skills

```text
.cursor/skills/work-on-task/SKILL.md
.cursor/skills/nestjs-standards/SKILL.md
.cursor/skills/nextjs-standards/SKILL.md
.cursor/skills/flutter-standards/SKILL.md
.cursor/skills/sync-project-docs/SKILL.md
.cursor/skills/record-completed-task/SKILL.md
```

---

## 3. Regla de oro

**Contexto primero → skills correctas después → no codear sin el flujo de `work-on-task` cuando la tarea lo requiera.**
