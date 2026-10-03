# Guía de uso (staff) — dónde está

La guía de uso tiene **un solo texto canónico**:

- Texto: [`web/content/docs/guia.md`](../../web/content/docs/guia.md). Se publica en el sitio público como `/docs` (4 páginas: Qué es, Primeros pasos, Módulos, Tu cuenta y el plan).
- Capturas: [`web/public/docs/`](../../web/public/docs/) (PNG, nombres `web-*` / `app-*`).

Cómo editar:

- Las secciones `# Parte 1` a `# Parte 4` definen las páginas (`web/lib/docs/guide.ts`).
- Una línea `**Captura:**` con `` `archivo.png` `` muestra la imagen solo si el PNG existe en `web/public/docs/`. Si la línea dice "falta" o "rehacer", no se publica.
- Lo que está después de `## Lista corta para ir disparando fotos` es el pendiente de fotos y no se publica.
- El asistente del Admin (`get_help`, `mcp/help/*.md`) resume esta guía: si cambia la guía, revisá también esos artículos.
