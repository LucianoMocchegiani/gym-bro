---
name: nextjs-standards
description: Aplica prácticas de Next.js App Router y TypeScript de GymBro. Úsala al crear o modificar el panel Admin, Super Admin, componentes web, formularios o consumo de la API.
---

# Estándares Next.js

## Estructura

- Usa App Router.
- Organiza por feature/dominio y reutiliza componentes solo cuando exista una abstracción real.
- Prefiere Server Components; usa `"use client"` únicamente para interacción, estado o APIs del navegador.
- Mantén acceso a API en una capa tipada; no disperses `fetch` por componentes.
- Separa estado remoto, estado de formulario y estado visual.
- Aplica autorización también en backend; ocultar un botón no es seguridad.

## UX del producto

- Estados explícitos: loading, vacío, error, éxito y permiso denegado.
- Formularios accesibles, validación clara y prevención de doble envío.
- Acciones peligrosas requieren confirmación y explicación.
- Respeta los wireframes como flujo, no como diseño visual rígido.

## TypeScript y TSDoc

- Props, respuestas y acciones completamente tipadas; evita `any`.
- TSDoc detallado para componentes, hooks, acciones y utilidades exportadas cuando su contrato o regla no sea obvio.
- Documenta propósito, invariantes, efectos laterales y `RN-*` / `CU-*` relevantes.
- No agregues comentarios redundantes a JSX evidente.

```ts
/**
 * Presenta y confirma un pase manual de ingreso.
 *
 * @remarks Requiere el permiso `acceso.pase_manual` y aplica CU-ACC-004.
 */
```

## Calidad y documentación

- Verifica lint, typecheck y build.
- No accedas a secretos desde Client Components.
- Mantén README y docs alineadas mediante `sync-project-docs`.
