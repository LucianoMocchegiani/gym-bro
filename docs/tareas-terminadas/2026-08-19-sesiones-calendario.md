# Sesiones: calendario semanal + roster + staff a cargo (web)

**Fecha:** 2026-08-19
**Roadmap:** Post-roadmap
**Commit:** `7c38147` — feat(web): calendario semanal de sesiones con acciones y superposicion
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/7c38147

## Resumen

Sesiones pasa de "grilla + calendario mensual" a un **calendario semanal de 7 días** tipo Teams con grilla horaria, cada sesión posicionada según su horario real. Las sesiones superpuestas se dividen el ancho (layout por clusters); las acciones por sesión van en un menú "⋯" (Datos / Roster / Waitlist / Eliminar). Se elimina la grilla, quedan tabs **Calendario | Recurrencias** (PageTabs, mismo patrón que Caja/Puerta). El roster reordena su form arriba con hint de staff a cargo, y Datos permite **asignar instructor** a la sesión.

## Decisiones (cuestionario aprobado)

- **Vista única**: calendario semanal (Teams) + tabs Calendario | Recurrencias; se elimina la grilla y sus filtros (Desde/Hasta/Estado/Incluir pasadas).
- **Un solo instructor** por sesión (sin cambio de esquema): se muestra y se asigna desde Datos.
- **Acciones por sesión**: menú "⋯" flotante con las 4 acciones con etiqueta (en bloques angostos/superpuestos no entran iconos).
- **Meta del bloque** (instructor · reservados/cupo): solo si el bloque tiene alto ≥ 54px y ancho completo; en mobile (<720px) siempre oculta.
- **Superposición**: se permite; visualmente lado a lado dividiendo el ancho (clusters de solapamiento encadenados).

## Cambios principales

- `SessionCalendar.tsx` (nuevo): grilla semanal con columna de horas (06:00–24:00, 72px/h), cabecera por día (hoy resaltado), nav ‹/Hoy/›, paginación completa de la semana (`listSessions` hasta cubrirla), layout por clusters para superposición, menú flotante "⋯" con backdrop, delete con `ConfirmDialog`.
- `sesiones/page.tsx`: tabs `PageTabs` (Calendario | Recurrencias), `weekStart` persistente, modales Datos/Roster/Waitlist + alta; se elimina `SessionsList`, filtros y helpers asociados.
- `SessionRosterPanel.tsx`: form "Reservar con crédito" arriba + hint "Staff a cargo: nombre | Sin asignar".
- `SessionDatosPanel.tsx`: selector de instructor (staff activos; read-only si falta permiso) + dirty-check.
- `RowActions.tsx`: `IconDots` (⋮) y `onClick` con evento (para anclar el menú).
- `AdminList.tsx`: limpieza — se elimina `ListDateField` (quedó sin uso).
- `globals.css`: variables `--line-strong`, `--panel-bg`, `--accent-line`, `--danger-line` (antes usadas sin definir); estilos del calendario semanal, menú flotante; limpieza de `.toolbar-check` y regla redundante de date.
- Sin cambios de API (ya soportaba `instructorId` y `from/to/status`).

## Validación

- Web: `npm run build` OK; `npm run lint` = baseline 13 (11 errores + 2 warnings preexistentes, sin nuevos).

## Referencias

- Commit: `7c38147` / https://github.com/LucianoMocchegiani/gym-bro/commit/7c38147