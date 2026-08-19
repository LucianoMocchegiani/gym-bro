# Avatar de cuenta + pantalla de cuenta + cambio de contraseña

**Fecha:** 2026-08-18
**Roadmap:** Post-roadmap (faltaGeneral — tarea #5 del orden de trabajo)
**Commit:** `f35d508` — feat(web): cuenta con avatar, pantalla de cuenta y cambio de contrasena
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/f35d508

## Resumen

El botón "Salir" y el nombre de usuario del topbar se reemplazaron por un avatar (círculo con iniciales) que abre la pantalla de cuenta. La pantalla muestra los datos del usuario, un botón "Cerrar sesión" (con popup de confirmación) y el cambio de contraseña dentro de un modal (mismo patrón que el resto de los forms). Funciona tanto para staff (`/cuenta`) como para Super Admin (`/super/cuenta`).

La API no exponía cambio de contraseña; se agregó el endpoint.

## Cambios principales

**API:**
- `POST /api/auth/change-password` (JWT, perfiles STAFF y SUPER): verifica la contraseña actual con bcrypt y, al cambiarla, revoca todos los refresh tokens del usuario (obliga a re-login). MEMBER → 400.
- `ChangePasswordDto` (`currentPassword`/`newPassword`, min 8) en `dto/auth.dto.ts`.

**Web:**
- `AccountPanel` compartido: datos del usuario, "Cerrar sesión" con `ConfirmDialog` (tone danger), y "Cambiar contraseña" que abre un `AdminModal` con el form; al confirmar muestra el éxito con "Iniciar sesión de nuevo" (no se puede cerrar con la sesión revocada).
- Páginas `/cuenta` (staff) y `/super/cuenta` (super).
- `AdminShell` y `SuperShell`: avatar con iniciales en el topbar (reemplaza usuario + "Salir"); SuperShell además pasó el botón de menú a hamburguesa ícono.
- `changePassword()` en `web/lib/api/auth.ts` (rama `auth: 'staff' | 'super'`).
- CSS: `.account-avatar-btn`, `.account-avatar-lg`, `.account-summary`, `.account-name`, `.success`; se eliminó el CSS muerto `.app-topbar-user`.

**Sync docs:** Postman (`Change password (JWT)`) y `docs/06-arquitectura.md`.

## Decisiones

- Un solo endpoint genérico que ramifica por `profileType`.
- Al cambiar la contraseña se revocan todas las refresh tokens → re-login obligatorio (mensaje claro).
- Pantalla de cuenta dedicada (página), no modal.
- Alcance: staff y super (ambos shells).
- Cerrar sesión con popup de confirmación.

## Validación

- `npm run build` (api y web) OK.
- `npm run lint`: sin errores nuevos (11 pre-existentes; bajó de 3 a 2 warnings al usarse `session` en SuperShell).
- Prueba manual: login staff → avatar → cuenta → cambio de contraseña en modal → re-login; super igual en `/super`; cerrar sesión con popup.

## Referencias

- Tarea #5 de `local/tareas flatantes/orden-de-trabajo.md` (`faltaGeneral.md`)
- Commit: `f35d508` / https://github.com/LucianoMocchegiani/gym-bro/commit/f35d508