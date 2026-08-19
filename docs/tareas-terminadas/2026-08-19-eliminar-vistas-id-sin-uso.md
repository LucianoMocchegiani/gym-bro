# Eliminar vistas [id] sin uso (modales en grilla)

**Fecha:** 2026-08-19
**Roadmap:** Post-roadmap (cleanup web)
**Commit:** `b944d8b` — chore(web): eliminar vistas [id] sin uso (modales en grilla)
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/b944d8b

## Resumen

Se eliminaron las 7 páginas dinámicas `/afiliados/[id]`, `/packs/[id]`, `/roles/[id]`, `/servicios/[id]`, `/sesiones/[id]`, `/staff/[id]` y `/super/tenants/[id]`. Eran fallbacks / compat de la época en que se editaba con redirect; desde que todo se edita en modales de la grilla no tenían uso.

## Cambios principales

- Borradas las 7 vistas `[id]`.
- Los links de staff que quedaban en Puerta (historial) y resultado/lista de accesos pasaron de `/staff/<id>` a `/staff?roles=<id>` (abre el modal de roles en la grilla).
- Verificado que no quedan links ni `router` hacia ninguna ruta `[id]`.

## Validación

- `npm run build` OK.
- `npm run lint`: sin errores nuevos (11 pre-existentes + 2 warnings).
- `grep` de rutas `[id]`: sin referencias.

## Referencias

- Commit: `b944d8b` / https://github.com/LucianoMocchegiani/gym-bro/commit/b944d8b