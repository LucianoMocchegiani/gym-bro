---
name: sync-project-docs
description: Mantiene README, roadmap y documentación C-producto alineados con cambios reales. Úsala al finalizar tareas, cambiar arquitectura, alcance, reglas, APIs o estructura del repositorio.
---

# Sincronizar documentación

## Al finalizar un cambio

Revisa solo los documentos afectados:

- `README.md`: setup, estructura, comandos y enlaces vigentes.
- `docs/00-indice.md`: documentos nuevos o estados.
- `docs/01-documento-maestro.md`: solo cambios de alcance/decisiones.
- `docs/03-modelo-dominio.md`: entidades o relaciones.
- `docs/04-reglas-de-negocio.md`: comportamiento normativo.
- `docs/05-casos-de-uso/`: flujos funcionales.
- `docs/06-arquitectura.md`: stack, módulos, adapters y decisiones técnicas.
- `docs/09-esquema-db.md`: **obligatorio** si cambió Prisma/migraciones (tablas, enums, FKs, diagrama).
- `docs/07-wireframes-ascii.md`: flujos de pantalla.
- `docs/08-casos-prueba-manuales.md`: criterios manuales.
- `docs/11-roadmap-mvp.md`: estado de tareas.
- `docs/99-backlog-post-mvp.md`: diferidos.

## Reglas

1. Documenta lo implementado, no intenciones.
2. No marques una tarea `[x]` si falta una parte necesaria para usarla.
3. Conserva IDs `RN-*` y `CU-*`; no los reutilices.
4. Si cambió una regla, actualiza su CU y prueba manual relacionada.
5. Si el cambio no altera comportamiento, evita tocar documentos de producto.
6. README debe permitir a otro desarrollador levantar y entender el repo sin depender del chat.
7. Si tocaste `api/prisma/schema.prisma` o migraciones, actualizá `docs/09-esquema-db.md` en la misma tarea (tablas, relaciones, enums, lista de migraciones).

Termina indicando qué documentos se actualizaron y por qué.
