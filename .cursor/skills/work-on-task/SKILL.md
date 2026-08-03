# Trabajar una tarea

## Flujo obligatorio

### 1. Contextualizar

- Aplica `gymbro-context`.
- Ubica la tarea en `docs/11-roadmap-mvp.md`.
- Revisa reglas, casos de uso, arquitectura y UI relacionados.
- Detecta dependencias y decisiones aún abiertas.

### 2. Cuestionario de implementación

Antes de editar código:

1. Explica brevemente qué se va a implementar.
2. Haz preguntas numeradas únicamente sobre decisiones que cambien el resultado.
3. Ofrece opciones concretas y una recomendación breve cuando ayude.
4. Pregunta por bloques si el tema es amplio.
5. Resume las decisiones cerradas.

No conviertas preferencias técnicas menores en preguntas: usa los estándares del proyecto.

### 3. Esperar aprobación

No implementes hasta que el usuario dé un consentimiento claro: “ok”, “dale”, “implementá” o equivalente.

Si el usuario ya proporcionó todas las decisiones y pidió implementar explícitamente, esa petición cuenta como aprobación.

### 4. Ejecutar

- Implementa solo el alcance aprobado.
- Aplica las skills técnicas correspondientes.
- Verifica en proporción al riesgo.
- Corrige errores introducidos.
- Aplica `sync-project-docs` y marca la tarea en el roadmap si corresponde.
- Si la tarea tocó **Prisma / migraciones**, actualizá `docs/09-esquema-db.md` (tablas, FKs, enums, diagrama, migraciones).
- Si la tarea agregó o cambió **endpoints HTTP de la API**, actualizá `postman/GymBro.api.postman_collection.json` (+ nota breve en `postman/README.md` si abre carpeta o flujo nuevo).
- Resume qué quedó hecho y cómo se validó. **Todavía no** registres la tarea terminada ni hagas commit.

### 5. Guía de prueba para el usuario

Al terminar la implementación (paso 4), **antes** de hablar de commit:

1. Entregá una sección clara **Cómo probar** con pasos concretos (comandos, URLs, Postman, credenciales seed si aplica, resultados esperados OK / error).
2. Incluí qué **no** hace falta probar si está fuera de alcance.
3. Esperá a que el usuario pruebe o diga que está bien.

No asumas que “build OK” alcanza: el usuario debe poder validar el comportamiento a mano.

### 6. Confirmación del usuario (commit / push / registro)

Solo después de la guía de prueba (y de que el usuario esté conforme o pida cerrar), preguntá explícitamente:

> ¿Está todo ok para commitear, pushear y registrar la tarea terminada?

Solo si el usuario confirma (ok / dale / sí / etc.):

1. `git add` de los archivos relevantes (sin secretos).
2. `git commit` con mensaje claro (convención del repo / type(scope): summary).
3. `git push` a la rama actual (tracking remoto).
4. Obtené el hash del commit (`git rev-parse --short HEAD` o el del commit creado).
5. Aplica `record-completed-task` **incluyendo el commit** (hash corto + mensaje, y URL del commit en GitHub si hay remote).
6. Si el registro de tarea terminada queda untracked/modificado después del primer commit, hacé un **segundo commit** del registro (y push) o incluí el archivo de registro en el mismo commit si el usuario aceptó el cierre completo de una vez — preferí: commit de implementación → push → crear registro con hash → commit del registro + push.

Orden preferido:

```text
implementación + docs de sync
  → guía “Cómo probar” (detalle)
  → usuario prueba / confirma
  → preguntar “¿todo ok para commit/push/registro?”
  → commit + push (SIN trailer Co-authored-by de Cursor)
  → record-completed-task (con hash del commit)
  → commit del registro + push
```

### Git: sin Co-authored-by de Cursor

- **Nunca** pases `--trailer "Co-authored-by: Cursor ..."`.
- **Nunca** agregues a mano `Co-authored-by: Cursor <cursoragent@cursor.com>` en el mensaje.
- Tras cada `git commit`, verificá con `git log -1 --format=full` que **no** aparezca ese trailer.
- Si el entorno lo inyectó igual: el repo tiene `git-hooks/commit-msg` que lo elimina; asegurate de que esté instalado en `.git/hooks/commit-msg` (copiar desde `git-hooks/commit-msg`) antes de commitear.
- Si un commit local (aún no pusheado) quedó con el trailer, rehacé el mensaje sin trailer (amend solo si cumple las reglas de amend del usuario; si no, reset suave + commit nuevo limpio **solo con aprobación**).

Si el usuario **no** confirma: dejá los cambios locales, no pushees, no registres como terminada (o registrá solo si pide “registrar sin push”).

### 7. Cierre en el chat

Informá:

- resultado;
- validación;
- hash(es) de commit y que se pusheó;
- link al markdown en `docs/tareas-terminadas/`;
- pendientes reales.

## Límites

- No sumar funcionalidades adyacentes sin aprobación.
- Lo diferido va a `docs/99-backlog-post-mvp.md`.
- Una tarea incompleta no se registra como terminada.
- **Nunca** commit/push de cierre sin la confirmación del paso 6.
- **Nunca** saltees la guía de prueba del paso 5 al cerrar una implementación.
