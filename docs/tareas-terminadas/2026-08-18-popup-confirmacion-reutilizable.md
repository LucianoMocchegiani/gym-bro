# Popup de confirmación reutilizable + dirty-check al guardar

**Fecha:** 2026-08-18
**Roadmap:** Post-roadmap (faltaGeneral — tarea #1 del orden de trabajo)
**Commit:** `339a0c1` — feat(web): popup de confirmacion reutilizable y dirty-check al guardar
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/339a0c1

## Resumen

`ConfirmDialog` reemplaza todos los `window.confirm` y los formularios manuales de confirmación de la web Admin. Tiene modo simple (Confirmar/Cancelar, tono danger opcional) y modo estricto (exige escribir `confirmWord`, ej. `ELIMINAR`, `DEVOLVER`, `CANCELAR`). Guardar en formularios de edición confirma cambios solo si el form está dirty; sin cambios, no pega a la API (cierra el modal si corresponde).

## Cambios principales

- Nuevo `web/components/ConfirmDialog.tsx` (simple + estricto) y prop `elevated` en `AdminModal` (z-index 90, se apila sobre modales anidados).
- Migración de `window.confirm` y formularios manuales en: super/tenants (suspender/reactivar), caja (arqueo), sesiones (desactivar recurrencia), roster (quitar reserva), waitlist (salir de la cola), cuenta afiliado (cancelar contrato `CANCELAR` + re-emitir offer), devoluciones (`DEVOLVER`), config (desconectar MP).
- Dirty-check con popup "Guardar cambios" en edición de pack, rol, servicio, sesión (datos), ficha afiliado, roles de staff, config y tenant super.
- Acciones sensibles con confirmación siempre: cancelar sesión, cambio de estado de afiliado.

## Decisiones

- `confirmWord` configurable; default `ELIMINAR`, conservando `DEVOLVER` y `CANCELAR` donde ya existían.
- Confirmación de guardar solo cuando el form está dirty; si no, se cierra el modal sin request a la API.
- `ConfirmDialog` se apila sobre los modales existentes vía `elevated`.

## Validación

- `npm run lint`: sin errores nuevos (11 pre-existentes de `react-hooks/set-state-in-effect`, verificados contra stash).
- `npm run build` OK.
- Prueba manual del flujo popup y dirty-check (incluye Network para confirmar que sin cambios no hay request).

## Referencias

- Tarea #1 de `local/tareas flatantes/orden-de-trabajo.md`
- Commit: `339a0c1` / https://github.com/LucianoMocchegiani/gym-bro/commit/339a0c1