# Limpieza lint web: react-hooks sin excepciones

**Fecha:** 2026-08-20
**Roadmap:** Post-roadmap
**Commit:** `a232710` — chore(web): limpiar lint react-hooks sin excepciones (0 problemas)
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/a232710

## Resumen

Se eliminaron los **11 errores** `react-hooks/set-state-in-effect` + 2 warnings del lint web **con arreglos reales, sin agregar ni dejar `eslint-disable`**. El lint pasa de baseline 13 a **0 problemas**. El patrón de "fetch al montar" quedó envuelto en una IIFE async con guard de cancelación (el setState ocurre tras el límite async, que es lo que la regla exige), y los sync de estado por prop/searchParams pasaron a ajuste en render (patrón oficial React).

## Cambios principales

- **Fetch al montar/refresco** (11 archivos): `useEffect(() => { void load(); }, [load])` → IIFE async con `if (cancelled) return; await load();` + cleanup de cancelación. Aplica a afiliados, packs, home, puerta, roles, servicios, staff, super/tenants, StaffCredentialPanel, devoluciones, auditoria, SessionCalendar, SessionRosterPanel, SessionWaitlistPanel y sesiones.
- **Ajuste en render** (patrón "adjusting state when a prop changes"): `DoorManualPassPanel` (reset al cambiar afiliado), `afiliados` (`?q=` del URL sincroniza input + página), `sesiones` (`?view=` sincroniza tab).
- **sesiones**: `load` pasa de función plana a `useCallback([page])` (permitió quitar la directiva de `exhaustive-deps`).
- **home**: se quita `setLoading(true)` directo en la rama temprana (loading ya inicia en `true`).
- **Warnings**: directiva sin uso en `puerta` eliminada; `VenueQr` usa `next/image` con `unoptimized`.

## Decisiones

- Se descartó la opción de supresiones por línea y la de un hook central `useAsyncData`; se priorizó el fix estructural real con riesgo mínimo y comportamiento idéntico (se conserva el skeleton en refetch).
- **Cero excepciones**: también se convirtieron las 6 supresiones `-- carga API` y la de `?q=` preexistentes; el repo queda sin ninguna directiva `eslint-disable` de `react-hooks` en web.

## Validación

- Web: `npm run lint` → **0 problemas**; `npm run build` → compila OK.

## Referencias

- `docs/11-roadmap-mvp.md` · React docs "You Might Not Need an Effect" (ajuste de estado durante render).