# Comprobante compartir, AuthGate y chat al último mensaje

**Fecha:** 2026-09-18
**Roadmap:** E9 app / E10 Admin
**Commit:** `ed08cfd` — feat: share receipts and send dead sessions to login
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/ed08cfd17fee5e03243fe1ed81baf71e706cbe99

## Resumen

El panel de comprobante (Caja staff e Historial) se comparte con la hoja del sistema. Si el JWT no vale, la app y el Admin van al login. El hilo del asistente arranca en el último mensaje.

## Cambios principales

- `share_plus` + Compartir en el panel de comprobante
- AuthGate móvil (`GET /auth/me`) y RequireStaff/Super con `verified`
- Ajustes: sección Desarrolladores; chat `ListView` invertido

## Decisiones

- Compartir es texto, no PDF
- En Caja no hay “Solicitar devolución”

## Validación

- Analyze mobile (Caja, auth, panel) y `tsc` web: OK
- Compartir requiere run completo del plugin (no hot reload)

## Referencias

- RN-PAG-009, RN-ROL-005
- Commit: `ed08cfd` / https://github.com/LucianoMocchegiani/gym-bro/commit/ed08cfd17fee5e03243fe1ed81baf71e706cbe99
