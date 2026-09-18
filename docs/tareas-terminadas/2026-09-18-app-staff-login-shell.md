# App staff: login, Acceso, offers y burbuja de chat

**Fecha:** 2026-09-18
**Roadmap:** E9 — app móvil (staff en el mismo binario)
**Commit:** `46bc1a7` — feat(mobile): staff login, shell, offers and chat bubble
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/46bc1a7b880794769b556261b9143f7c9cb11557

## Resumen

El login elige Afiliado o Staff. Staff entra a Inicio · Acceso · Ajustes, usa la misma wallet y una bandeja propia (`GET /me/staff-credential-offers`). El asistente es una burbuja arrastrable que abre el último hilo (lápiz / reloj como en la web). Caja y roster de sesiones quedan para el siguiente corte.

## Cambios principales

- `POST /auth/staff/login` + `GET /me/permissions` (Caja si `cashier.operate`)
- `GET/POST /me/staff-credential-offers` (+ accept/fail)
- `StaffShell`, burbuja chat-api, Postman y docs

## Decisiones

- Chat no es tab: burbuja flotante, posición persistida
- Offers de staff no se mezclan con packs del socio

## Validación

- `npx tsc --noEmit` (api) y `fvm dart analyze` (mobile): OK
- Device: login staff, nav, burbuja; bandeja 404 hasta rebuild de API en VPS

## Referencias

- RN-ROL-005
- Commit: `46bc1a7` / https://github.com/LucianoMocchegiani/gym-bro/commit/46bc1a7b880794769b556261b9143f7c9cb11557
