# App: opt-out de mail en Ajustes

**Fecha:** 2026-09-30
**Roadmap:** E8 / E9 — Avisos
**Commit:** `aee6dfd` — feat(mobile): correo por tipo de aviso en Ajustes
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/aee6dfdbe880ad4c4dd8e9fcda11b8c7fc2b9735

## Resumen

La bandeja in-app sigue en Inicio → Avisos. El correo por tipo de evento se configura en Ajustes → Avisos (solo afiliado). Guía de prueba en `docs/uso/probar-notificaciones.md`.

## Cambios principales

- `NotificationPrefsScreen` desde Ajustes
- Bandeja sin switches

## Validación

- `dart analyze` de notificaciones y Ajustes

## Referencias

- CU-NOT-003 · CU-NOT-005
- Commit: `aee6dfd` / https://github.com/LucianoMocchegiani/gym-bro/commit/aee6dfdbe880ad4c4dd8e9fcda11b8c7fc2b9735
