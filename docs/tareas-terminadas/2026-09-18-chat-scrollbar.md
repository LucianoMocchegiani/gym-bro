# Chat: scrollbar del asistente alineada al resto

**Fecha:** 2026-09-18
**Roadmap:** E9 / E10 asistente
**Commit:** `bda92b4` — fix(chat): use shared app scrollbar on the assistant
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/bda92b4

## Resumen

El hilo, el historial y el composer del asistente usan la misma barra fina que sidebar y modales (`app-scroll`).

## Cambios principales

- Clase global `app-scroll` (mismo CSS que `.app-sidebar`)
- Drawer, lista de conversaciones y textarea del mensaje

## Validación

- Manual: drawer con hilo largo

## Referencias

- Commit: `bda92b4` / https://github.com/LucianoMocchegiani/gym-bro/commit/bda92b4
