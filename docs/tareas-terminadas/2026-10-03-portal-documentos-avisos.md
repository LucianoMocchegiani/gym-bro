# Documentos y avisos en el portal web del socio

**Fecha:** 2026-10-03
**Roadmap:** Post-MVP — web del gym
**Commit:** `a08f678` — feat(web): documentos y avisos en el portal del socio
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/a08f678

## Resumen

El portal web del socio ya tiene lo que faltaba de la app: **Documentos** (su carpeta, solo lectura) y **Avisos** (bandeja y correo por tipo de aviso). Con esto, en la app solo quedan exclusivas la credencial y el escaneo en la puerta.

## Cambios principales

- `/portal/documentos` (`MemberDocuments`): lista nombre, etiqueta, fecha y autor; nota e imagen en un modal, PDF se descarga con su nombre original.
- `/portal/avisos` (`MemberNotices`): Nuevos / Anteriores; abrir marca leído y muestra título y texto. Abajo, «Avisos por correo» con los tildes de `/me/notification-preferences`.
- `useMemberNotices` vive en `MemberArea`: un solo fetch de la bandeja para el contador del menú, el aviso del inicio y la página de avisos.
- `apiBlob` en el cliente común (con refresh en 401). La carpeta del staff dejó de armar el token a mano: sube con `apiMultipart` y descarga con `apiBlob`; `folderItemName` es compartido.
- `NOTIFICATION_EVENT_LABELS`: los mismos nombres de evento que la app.

## Decisiones

- Sin endpoints ni migraciones nuevas: se reusan `/me/folder*` y `/me/notifications*` (Postman sin cambios).
- Leído y preferencias son el mismo dato que en la app: lo que se lee o destilda en un lado se ve en el otro.

## Validación

- `tsc --noEmit` de la web pasa; eslint de los archivos nuevos limpio (dos avisos viejos en `PersonFolderModal`, fuera de las líneas tocadas).
- Prueba manual pendiente: `local/en-testeo/portal-documentos-avisos.md` (casos G29–G32 de `08`).

## Referencias

- RN-CTA-009, CU-FOL-003, CU-NOT-003/005, `06` (web del gym), guía (`Portal web del socio`), ayuda MCP `app`, `avisos`, `carpeta`.
- Commit: `a08f678` / https://github.com/LucianoMocchegiani/gym-bro/commit/a08f678
