# Una sola cuenta del gym en `/cuenta` (sin `/dashboard/cuenta`)

**Fecha:** 2026-10-03
**Roadmap:** Post-MVP — web del gym
**Commit:** `91aa056` — feat(web): una sola cuenta del gym en /cuenta (sin /dashboard/cuenta)
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/91aa056

## Resumen

El gym tenía dos pantallas de cuenta: `/dashboard/cuenta` para el staff y `/cuenta` para el socio. Queda solo `{slug}/cuenta` para todos, y el avatar del panel lleva ahí. Cubre al socio, al staff y la impersonación de plataforma.

## Cambios principales

- `GymAccountPage` toma a la persona de la sesión de la cuenta Faciliter; si no está, de la del socio, y si no, de la del staff. La contraseña se maneja con esa sesión. En una impersonación manda la sesión staff y aparece **Volver a plataforma**.
- `AdminShell` y `GymAccountLink` apuntan siempre a `/cuenta`. El modo limitado ya no exceptúa `/dashboard/cuenta`.
- El middleware redirige `/dashboard/cuenta` a `/cuenta` con 308. Se eliminan `app/dashboard/cuenta` y `StaffCuentaPage`.

## Validación

- `tsc --noEmit` de la web pasa y eslint de los archivos tocados está limpio.
- Prueba manual pendiente: casos G27 y G28 de `docs/08` y `local/en-testeo/portal-ruta-y-cuenta.md`.

## Referencias

- RN-CTA-006, `06` (web del gym e impersonación), `web/README.md`, `mcp/help/cuenta.md`, `web/content/docs/guia.md`.
- Commit: `91aa056` / https://github.com/LucianoMocchegiani/gym-bro/commit/91aa056
