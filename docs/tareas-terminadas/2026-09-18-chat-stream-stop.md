# Chat: stream en el hilo y Parar

**Fecha:** 2026-09-18
**Roadmap:** E9 / E10 asistente
**Commit:** `a1075c7` — feat(chat): stream words in-thread with a matching Stop
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/a1075c7a0bca5a88709d046d5db62cb728e5f69f

## Resumen

El asistente escribe de a poco en el hilo (web y app). “Pensando…” va abajo, no bloquea. Parar aborta el stream con el mismo color que Enviar.

## Cambios principales

- App: parsea SSE `text-delta` + typewriter; abort HTTP
- Web: typewriter por palabra; placeholder Pensando…

## Validación

- Analyze mobile chat: OK
- Manual: enviar / parar en app y panel

## Referencias

- Commit: `a1075c7` / https://github.com/LucianoMocchegiani/gym-bro/commit/a1075c7a0bca5a88709d046d5db62cb728e5f69f
