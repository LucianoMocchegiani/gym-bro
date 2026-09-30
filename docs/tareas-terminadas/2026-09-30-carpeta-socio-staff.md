# Carpeta de notas y files (socio y staff)

**Fecha:** 2026-09-30
**Roadmap:** E7 (reemplaza rutinas plantilla)
**Commit:** `4058ad7` — feat(folder): carpeta de notas y files para socio y staff
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/4058ad7e9c4e620e1a00a9135e4f8c8b82cd2c0e

## Resumen

Cada socio y cada staff tiene una carpeta (notas + PDF/imagen). Carga solo en Admin; lectura en app (Mis documentos). Files por JWT, no URL pública de R2. El chat guía con `get_help` topic `carpeta`.

## Cambios principales

- Prisma `folder_labels` / `folder_items`; `FileStoragePort.getObject`
- Modal en `/afiliados` y `/staff`; Flutter Ajustes
- E7 roadmap = carpeta; rutinas plantilla al backlog
- MCP `mcp/help/carpeta.md` y prompts chat-api

## Decisiones

- Etiquetas las define el tenant
- No hay módulo de rutinas por días en este corte

## Validación

- `prisma generate`; `tsc --noEmit` api y web; `dart analyze` carpeta (infos)
- Prueba en VPS a cargo del usuario (migrate + rebuild api/web/mcp/chat-api; app si aplica)

## Referencias

- `docs/05-casos-de-uso/carpeta.md` · RN-FOL-001..004
- Commit: `4058ad7` / https://github.com/LucianoMocchegiani/gym-bro/commit/4058ad7e9c4e620e1a00a9135e4f8c8b82cd2c0e
