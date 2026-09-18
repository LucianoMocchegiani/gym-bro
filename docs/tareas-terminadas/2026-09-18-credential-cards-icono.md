# Cards de credencial Faciliter, display de pack e icono de app

**Fecha:** 2026-09-18
**Roadmap:** E acceso / wallet SSI
**Commit:** `4198a12` — feat(mobile): Faciliter credential cards, pack display, and app icon
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/4198a12

## Resumen

La card de credencial sigue el layout Kuatia (logo, título, emisor, sheen) con default verde Faciliter y sin sombra. Al emitir un pack se sincroniza `display.name`. La app usa icono y splash de marca (lima sobre negro).

## Cambios principales

- Tile SSI + mapper `display.name` / marca; fallback `vct` y DID
- Offer de pack: `syncPackConfiguration` antes de crear el offer
- Launcher + splash nativos desde `web/public/favicon.png`

## Validación

- Manual Acceso: cards y re-emisión del mensual para el display
- Manual: reinstalar APK para ver icono/splash

## Referencias

- Commit: `4198a12` / https://github.com/LucianoMocchegiani/gym-bro/commit/4198a12
