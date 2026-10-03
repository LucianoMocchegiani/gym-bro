# Guía `/docs` en 4 capítulos y `get_help` alineado al producto

**Fecha:** 2026-10-02
**Commit:** `283d29c` — docs: guia /docs en 4 capitulos y get_help alineado al producto
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/283d29c6d6a58c6b6d7bac44814d67de4d31c2a0

## Resumen

La guía pública `/docs` y la ayuda del asistente (`get_help`) dicen lo mismo que el producto de hoy: cuenta Faciliter y Tus gyms, alta self-serve, débito por link de Mercado Pago, Vencimientos, Avisos, carpeta, Plan / Uso, puerta con QR y ZKTeco opcional. Un solo texto canónico y un capítulo nuevo para la cuenta y el plan. De paso se corrigieron dos desfasajes del producto (password en altas web y texto de Plan / Uso).

## Cambios principales

- `web/content/docs/guia.md` reescrito como texto canónico; `/docs/cuenta` (Tu cuenta y el plan) en `guide.ts`, índice y sitemap.
- `docs/uso/guia-web-y-app.md` queda como puntero; se borra `docs/uso/imagenes/` (duplicado de `web/public/docs/`).
- `get_help`: topics nuevos `cuenta`, `plan`, `avisos`, `app` con aliases (login, contratar, notificaciones, zkteco…); corregidos `guia`, `producto`, `caja`, `debito`, `puerta`, `sesiones`, `packs`, `roles`, `chat`, `devoluciones`, `vencimientos`, `afiliados`, `soporte`.
- Prompt de la landing (`chat-api`): contratar = **Contratar** self-serve o reunión.
- Altas de afiliado y staff en el panel con password opcional (`ChangeMe123!` temporal, RN-ASI-003).
- Plan / Uso: débito MP si contrató en faciliter.xyz, pago a Faciliter si lo dio de alta la plataforma; cambio de plan / baja por mail.
- Hint de Vencimientos: los mails de pack por vencer / vencido ya salen solos.

## Decisiones

- ZKTeco se presenta como opción: depende del modelo y se coordina con los técnicos. Lo que falta para el aparato real quedó en un ticket local.
- Capturas: una línea `falta` / `rehacer` no se publica; `lista (repetir)` se publica con la foto vieja hasta reemplazarla. Las fotos pendientes quedaron en un ticket local aparte.

## Validación

- `tsc --noEmit` en `web`, `mcp` y `chat-api`.
- Script que parsea las 4 páginas de `/docs`: sin restos del playbook; 22 topics con su artículo.
- Revisión de las capturas publicadas (menú viejo y overlay de Next detectados → "repetir").

## Referencias

- `web/content/docs/guia.md`, `web/lib/docs/guide.ts`, `mcp/help/`, `mcp/src/tools/help.ts`
- `docs/19-puerta-molinete-hw-sw.md`, `docs/99-backlog-post-mvp/acceso.md`
- Commit: `283d29c` / https://github.com/LucianoMocchegiani/gym-bro/commit/283d29c6d6a58c6b6d7bac44814d67de4d31c2a0
