# Tema claro/oscuro con icono + hamburguesa responsive

**Fecha:** 2026-08-18
**Roadmap:** Post-roadmap (faltaGeneral — tarea #4 del orden de trabajo)
**Commit:** `17ae617` — feat(web): tema claro/oscuro con icono y hamburguesa responsive
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/17ae617

## Resumen

El toggle de tema del topbar pasó de texto "Claro/Oscuro" a icono (sol en modo oscuro → cambia a claro; luna en claro → cambia a oscuro). El botón de menú responsive pasó de texto "Menú" a una hamburguesa solo icono. La lógica de tema y del menú deslizante ya existía.

## Cambios principales

- `ThemeToggle`: icono del estado objetivo (`NavIconSun`/`NavIconMoon`), mantiene `aria-label`/`title`.
- `AdminShell`: botón hamburguesa (`NavIconMenu`) en lugar del texto "Menú", con `aria-label="Abrir menú"`.
- Iconos nuevos en `AdminNavIcons`: `NavIconSun`, `NavIconMoon`, `NavIconMenu`.
- CSS: `theme-toggle` y `app-menu-btn` como botones de icono (centrados, sin texto).

## Decisiones

- Icono del estado objetivo (mantiene la semántica del texto previo).
- Hamburguesa solo icono.

## Validación

- `npm run lint`: sin errores nuevos (11 pre-existentes).
- `npm run build` OK.
- Prueba manual del toggle en ambos temas y del menú en pantalla angosta.

## Referencias

- Tarea #4 de `local/tareas flatantes/orden-de-trabajo.md` (`faltaGeneral.md`)
- Commit: `17ae617` / https://github.com/LucianoMocchegiani/gym-bro/commit/17ae617