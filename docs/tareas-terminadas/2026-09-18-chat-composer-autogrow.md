# Composer del chat: crece y después scrollea

**Fecha:** 2026-09-18
**Roadmap:** E9 / E10 asistente
**Commit:** `7d472c7` — fix(chat): grow composer until cap then scroll
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/7d472c71671cbc2e3f4c61a1d200d8c23d9aa3a0

## Resumen

El input del asistente crece con el texto y, al tope, scrollea adentro: web ~8 líneas, app 5.

## Cambios principales

- Web: autosize del textarea (`scrollHeight` + `max-height`)
- App: `minLines` 1 / `maxLines` 5, Enter = nueva línea

## Validación

- Manual: párrafo largo en panel y en app

## Referencias

- Commit: `7d472c7` / https://github.com/LucianoMocchegiani/gym-bro/commit/7d472c71671cbc2e3f4c61a1d200d8c23d9aa3a0
