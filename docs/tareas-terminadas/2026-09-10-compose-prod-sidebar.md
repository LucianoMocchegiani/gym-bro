# Compose de imágenes de build y sidebar fija

**Fecha:** 2026-09-10
**Roadmap:** E12 — deploy / hardening
**Commit:** `0e2df5b` — feat(docker): Compose de imagenes de build y sidebar fija en claro
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/0e2df5b

## Resumen

Un solo `docker-compose.yml` con imágenes compiladas (sin bind-mount de código). La API y chat-api aplican `prisma migrate deploy` al arrancar; el seed demo sigue a mano. La sidebar Admin deja de ensancharse en tema claro con slugs largos.

## Cambios principales

- `api/Dockerfile` y `web/Dockerfile` (Next standalone); chat-api migra al start
- Compose: sin pgAdmin, contenedores `faciliter-*`, Postgres/Redis en loopback
- Sidebar: ancho fijo `15.5rem` + ellipsis del brand

## Decisiones

- Un Compose, no un archivo prod aparte
- Seed nunca al arrancar (resetea passwords demo)

## Validación

- `docker compose build` de api, web, chat-api y mcp
- `docker compose up --build -d` + seed
- Tema claro en `{slug}.faciliter.xyz`: sidebar angosta

## Referencias

- [docs/13-setup-db-desde-cero.md](../13-setup-db-desde-cero.md)
- Commit: `0e2df5b` / https://github.com/LucianoMocchegiani/gym-bro/commit/0e2df5b
