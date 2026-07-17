# Skills de GymBro

Skills de proyecto compartidas con cualquier agente que trabaje en el repositorio.

## Cómo usarlas

**Entrada recomendada:** invocá `gymbro-context` y describí la tarea.

```text
Usá @.cursor/skills/gymbro-context/SKILL.md para {tarea}
```

`gymbro-context` actúa como **hook/router**:

1. Contextualiza (README + índice + docs del tema).
2. Elige las skills necesarias (`work-on-task`, Nest/Next/Flutter, sync, registro).
3. Las lee y las sigue.

Podés sumar skills a mano si querés forzar una:

```text
Usá @gymbro-context para implementar pagos, y además @nestjs-standards
```

| Skill | Uso |
|-------|-----|
| `gymbro-context` | Hook: contexto + ruteo a otras skills |
| `work-on-task` | Preguntas → aprobación → implementar → “¿todo ok?” → commit/push → registrar con hash |
| `nestjs-standards` | NestJS + TSDoc |
| `nextjs-standards` | Next.js + TSDoc |
| `flutter-standards` | Flutter + Dartdoc |
| `sync-project-docs` | README y docs alineadas |
| `record-completed-task` | Cierre en `docs/tareas-terminadas/` **con referencia al commit** |
