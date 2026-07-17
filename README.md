# GymBro

Plataforma SaaS multi-tenant para gestión de gimnasios y estudios (Argentina).

## Documentación

La definición de producto (C-producto) está en [`docs/`](./docs/00-indice.md).

Punto de entrada: [docs/00-indice.md](./docs/00-indice.md)

Método para definir módulos post-MVP: [docs/10-metodo-definicion-producto.md](./docs/10-metodo-definicion-producto.md)

Roadmap del MVP: [docs/11-roadmap-mvp.md](./docs/11-roadmap-mvp.md)

## Flujo de trabajo para agentes

- Skills compartidas: [`.cursor/skills/`](./.cursor/skills/)
- **Entrada:** `@.cursor/skills/gymbro-context/SKILL.md` + la tarea → el agente se contextualiza y elige el resto de skills.
- Al cerrar una tarea: preguntar si está ok → commit + push → registrar en `docs/tareas-terminadas/` con el hash del commit.
- Registro de tareas terminadas: [`docs/tareas-terminadas/`](./docs/tareas-terminadas/)

Antes de implementar: contexto → decisiones con el usuario → aprobación. Al terminar: confirmación → git → docs alineadas + registro con commit.

## Git hook (sin Co-authored-by de Cursor)

Plantilla versionada: [`git-hooks/commit-msg`](./git-hooks/commit-msg). Instalación local (una vez por clone):

```powershell
Copy-Item -Force git-hooks\commit-msg .git\hooks\commit-msg
```

Detalle: [`git-hooks/README.md`](./git-hooks/README.md).
