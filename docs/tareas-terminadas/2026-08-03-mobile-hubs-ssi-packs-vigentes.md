# App afiliado: hubs SSI + packs vigentes hoy

**Fecha:** 2026-08-03  
**Roadmap:** E9 / Quark paso 3–4 (app) + CU-AFI-005 coverage  
**Commit:** `e6d65a8` — feat(mobile,api): hubs SSI Acceso/Credenciales y packs vigentes hoy  
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/e6d65a8

## Resumen

Nav de 3 hubs (Inicio · Acceso · Ajustes). Acceso: escanear OID4VCI/VP + Credenciales (pendientes + VCs wallet, sin stub). Inicio lista packs vigentes hoy vía `GET /me/account?coverage=current` (filtro en DB). Historial de compras anotado en backlog.

## Cambios principales

- Shell 3 hubs; eliminado stub/`stub-venue` de la app
- Cards SSI + pendientes de aceptación
- API `coverage=current|all` en estado de cuenta
- Docs CU-AFI-005, wireframes, backlog historial

## Validación

- `flutter analyze lib` OK
- Flujo manual hub Acceso / packs vigentes

## Referencias

- [12-acceso-quark-oid4-diseno.md](../12-acceso-quark-oid4-diseno.md)
- Commit: `e6d65a8` / https://github.com/LucianoMocchegiani/gym-bro/commit/e6d65a8
