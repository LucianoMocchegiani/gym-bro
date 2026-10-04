# Web del gym: portal del socio en `/portal` y cuenta con avatar en `/cuenta`

**Fecha:** 2026-10-03
**Roadmap:** Post-MVP — portal web del afiliado
**Commit:** `7474869` — feat(web): portal del socio en /portal y cuenta con avatar en /cuenta
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/7474869

## Resumen

El portal del socio estaba en `/cuenta`, así que el gym se quedó sin página de cuenta y el header no tenía avatar. El portal pasa a `{slug}/portal/*` y `/cuenta` vuelve a ser la cuenta de quien entró: datos, contraseña, cerrar sesión y accesos al portal o al panel. El header del gym muestra el mismo avatar que el apex y el panel, y el botón Salir del portal desaparece.

## Cambios principales

- Rutas: `app/portal/layout.tsx` (shell del gym), `app/portal/page.tsx` (inicio, `?compra=` y `?alta=`) y `app/portal/(area)/*` (`MemberArea`, secciones que exigen socio).
- API: `memberWebBackUrl` arma la vuelta de MP a `/portal?compra|alta=`. En la web, `/cuenta?compra|alta=` redirige a `/portal` con el mismo query.
- `GymAccountPage`: `AccountPanel` con la sesión de la cuenta Faciliter (o la del socio) y accesos según los perfiles. Solo staff va a `/dashboard/cuenta`.
- `AccountAvatarLink` + `accountInitials`, compartidos por `MarketingAccountLink`, `AdminShell`, `GymAccountLink` y `AccountPanel` (antes había tres copias).
- Las funciones de contraseña del cliente aceptan `SessionKind` (también `member`).
- Login, `homeForProfile`, `profileForPath`, «Ya soy socio» y `/comprar` apuntan a `/portal`. `robots.txt` excluye `/portal`.

## Decisiones

- Cerrar sesión vive solo en la cuenta (avatar), como en el apex y el panel.
- Se redirigen las vueltas viejas de `/cuenta`, para que no se rompan los pagos de MP que estaban en curso durante el deploy.

## Validación

- `tsc --noEmit` pasa en web y API. eslint de los archivos tocados está limpio.
- Prueba manual pendiente: `local/en-testeo/portal-ruta-y-cuenta.md` y casos G22, G25 y G26 de `docs/08`.

## Referencias

- RN-CTA-006/008/009, CU-AFI-007, `06` (web del gym), `08` sección «Web del gym», `web/README.md`, `mcp/help/app.md` y `guia.md`.
- Commit: `7474869` / https://github.com/LucianoMocchegiani/gym-bro/commit/7474869
