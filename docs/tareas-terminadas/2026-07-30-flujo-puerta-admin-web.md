# Pantalla / flujo puerta (Admin web)

**Fecha:** 2026-07-30  
**Roadmap:** E6 — Pantalla puerta · E10 — Login staff + pase/historial  
**Commit:** `b466ebb` — feat(web): add staff login and door access flow  
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/b466ebb

## Resumen

Primer slice del Admin web: login Staff y flujo de puerta (verificar ingreso stub, pase manual e historial reciente). La API habilita CORS para el panel en `localhost:3000`.

## Cambios principales

- Rutas `/login`, `/puerta`, `/puerta/pase-manual`
- Cliente API tipado + sesión localStorage (refresh ante 401)
- CORS `CORS_ORIGIN` en Nest
- Roadmap E6/E10 y docs web/arquitectura

## Decisiones

- Sin cámara QR (pegar token stub); ambos modos de escaneo
- Layout centrado tipo kiosk

## Validación

- `npm run lint` + `npm run build` en `web/`
- Prueba manual en Compose: login, verify, pase manual, historial

## Referencias

- CU-ACC-001/004/005 · `web/README.md` · `docs/11-roadmap-mvp.md`
- Commit: `b466ebb` / https://github.com/LucianoMocchegiani/gym-bro/commit/b466ebb
