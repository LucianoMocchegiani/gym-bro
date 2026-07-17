# Registrar tarea terminada

## Cuándo

Solo después de que:

1. la tarea esté implementada y verificada;
2. el usuario haya confirmado el cierre en `work-on-task` (“¿está todo ok?”);
3. exista al menos un **commit** de la implementación (idealmente ya pusheado).

No registrar planes, trabajo parcial ni cierres sin commit (salvo que el usuario lo pida explícitamente).

## Archivo

Crear:

```text
docs/tareas-terminadas/YYYY-MM-DD-slug-descriptivo.md
```

- Fecha primero para orden cronológico.
- Slug breve en minúsculas y guiones.
- Un archivo por tarea cerrada.

## Contenido

```markdown
# {Título de la tarea}

**Fecha:** YYYY-MM-DD
**Roadmap:** {E# — tarea, si aplica}
**Commit:** `{hash-corto}` — {mensaje del commit}
**Remote:** {URL del commit en GitHub, si aplica}

## Resumen

{2–5 líneas sobre qué quedó funcionando.}

## Cambios principales

- {título corto}

## Decisiones

- {solo decisiones relevantes}

## Validación

- {comandos o verificación manual realizada}

## Diagrama

{Mermaid o ASCII únicamente si aclara un flujo no evidente.}

## Referencias

- {docs, CU o RN relacionados}
- Commit: `{hash}` / {URL}
```

Si hubo **dos commits** (implementación + registro), referenciá el de **implementación** como principal y mencioná el del registro si aporta.

## Reglas

- Sé breve; no copies diffs ni pegues grandes bloques de código.
- Omite `Decisiones` o `Diagrama` si no aportan.
- Usa Mermaid para relaciones/flujo y ASCII para algo pequeño.
- **Commit es obligatorio** en el encabezado cuando el cierre pasó por git.
- Actualiza `docs/tareas-terminadas/README.md` agregando la entrada más reciente.
- Aplica `sync-project-docs` antes del registro final (si aún no se aplicó en `work-on-task`).
