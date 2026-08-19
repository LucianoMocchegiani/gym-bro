# Super: editar tenant en modal + ficha de afiliado desde grilla con búsqueda

**Fecha:** 2026-08-19
**Roadmap:** Post-roadmap (faltaGeneral — tarea #6 del orden de trabajo + ajuste de sesiones)
**Commit:** `5621b71` — feat(web): editar super en modal y ficha de afiliado desde grilla con busqueda
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/5621b71

## Resumen

En Super Admin, el botón "Editar" de un tenant abría la página `/super/tenants/[id]` (redirect). Ahora abre un modal desde el listado (`?editar=<id>`), con el mismo form (nombre/slug + suspender/reactivar) reutilizable en página o modal.

Además, el nombre de un afiliado que aparecía como link a `/afiliados/[id]` (página de detalle) ahora navega a la **grilla de afiliados con la ficha abierta en modal y la búsqueda del afiliado aplicada**, para no cargar todos los demás.

## Cambios principales

**Super tenant edit (tarea #6):**
- `TenantEditPanel` nuevo: carga el tenant, form nombre/slug con dirty-check + popup de confirmación, y suspender/reactivar con popup; sirve para modal y página.
- `/super/tenants`: botón Editar abre modal (`?editar=<id>`) en vez de redirigir; al guardar refresca el listado y muestra flash.
- `/super/tenants/[id]`: refactor a usar `TenantEditPanel` (fallback / deep link).

**Ficha de afiliado desde grilla con búsqueda:**
- `web/lib/member-link.ts`: `memberFichaHref(id, search)` → `/afiliados?ficha=<id>&q=<nombre|email>`.
- La grilla de afiliados ahora lee `?q=` de la URL (búsqueda persistente): el input se sincroniza con la URL y `openFicha`/`openCuenta`/`closeModals` preservan el filtro.
- Links de afiliado actualizados en: Roster y Waitlist de sesiones, Puerta (resultado + historial), Reportes (pagos) y Devoluciones (listado y modal).

## Decisiones

- En lugar de ficha apilada sobre el modal de la sesión, se navega a la grilla con la búsqueda aplicada (elegido por el usuario: "mejor a la grilla pero con la búsqueda de ese afiliado realizada, así no trae todos los demás").
- La búsqueda vive en la URL (`?q=`), así persiste al recargar o navegar.

## Validación

- `npm run build` OK.
- `npm run lint`: sin errores nuevos (11 pre-existentes + 2 warnings).
- Prueba manual: editar tenant desde el listado abre modal; desde sesiones (roster/waitlist) el nombre del afiliado lleva a la grilla filtrada con la ficha abierta.

## Referencias

- Tarea #6 de `local/tareas flatantes/orden-de-trabajo.md` (`faltaGeneral.md`)
- Commit: `5621b71` / https://github.com/LucianoMocchegiani/gym-bro/commit/5621b71