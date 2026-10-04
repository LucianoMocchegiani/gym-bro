# Header del gym con la misma disposición que el topbar del panel

**Fecha:** 2026-10-03
**Roadmap:** Post-MVP — web del gym
**Commit:** `4eefb0b` — feat(web): header del gym con la misma disposición que el topbar del panel
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/4eefb0b

## Resumen

Al pasar del panel a `/cuenta`, el tema y el avatar saltaban de lugar: el header del gym era centrado y más alto, y las iniciales salían de otra sesión. Ahora el header del gym es una barra a todo el ancho con el mismo alto, borde, fondo y orden que el topbar del panel, y los dos muestran a la misma persona.

## Cambios principales

- `.mkt-header-bar`: sale del padding de `.mkt-front`, usa el padding y el fondo de `.app-topbar` y queda fija arriba.
- `GymHeaderActions` (antes `GymAccountLink`) tiene el acceso (portal o panel), el tema y el avatar, en el orden del panel.
- `useGymAccountPerson`: la cuenta Faciliter, si no el socio, si no el staff (en una impersonación, el staff). Lo usan `AdminShell`, el header y `GymAccountPage`.

## Validación

- `tsc --noEmit` de la web pasa (salvo los tipos viejos de `.next`) y eslint de los archivos tocados está limpio.
- Prueba manual pendiente: punto 1.5 de `local/en-testeo/portal-ruta-y-cuenta.md`.

## Referencias

- `06` (web del gym), RN-CTA-006.
- Commit: `4eefb0b` / https://github.com/LucianoMocchegiani/gym-bro/commit/4eefb0b
