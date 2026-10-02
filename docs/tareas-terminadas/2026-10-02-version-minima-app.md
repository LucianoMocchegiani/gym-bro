# App: versión mínima y aviso de actualización

**Fecha:** 2026-10-02
**Roadmap:** Backlog app afiliado — Versión mínima / aviso de actualización
**Commit:** `6056d26` — feat(mobile): version minima y aviso de actualizacion
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/6056d26

## Resumen

La app consulta al abrir `GET /api/public/app-config` y compara su build number con la política de su plataforma. Debajo del mínimo muestra una pantalla bloqueante con botón a la tienda; debajo del último sugiere actualizar una sola vez por versión. Sin red, API caída o timeout (4 s) sigue normal. La política se cambia por env de la API, sin publicar otra versión.

## Cambios principales

- API: módulo `mobile-app` con `GET /api/public/app-config` (sin auth), leído de `APP_MIN_BUILD_*`, `APP_LATEST_BUILD_*` y `APP_STORE_URL_*`.
- App: `AppUpdateController` + `AppUpdateGate` (`lib/features/app_update/`), integrados en el arranque de `main.dart`; `package_info_plus`.
- Postman: Health → Public GET app config.
- Docs: sección 7 de `publicar-tiendas.md` (cuándo subir cada número), README mobile, backlog.

## Decisiones

- Mínimo y último **por plataforma** (Android e iOS con builds distintos).
- El aviso suave se recuerda en SharedPreferences por `latestBuild`.
- Nunca bloquea si no puede consultar.
- `latestBuild` se sube al mínimo si viene menor; Android trae URL de Play por defecto, iOS queda vacía hasta tener la ficha.

## Validación

- `flutter analyze` sin issues; `flutter test` OK (test de humo con `pump` de 5 s por el timeout).
- `npx tsc --noEmit` en api; servicio probado con env de ejemplo.
- Prueba manual en el celular a cargo del usuario (`local/en-testeo/probar-version-minima.md`).

## Referencias

- [publicar-tiendas.md](../mobile/publicar-tiendas.md#7-actualizaciones-y-versión-mínima) · [app-afiliado.md](../99-backlog-post-mvp/app-afiliado.md)
- Commit: `6056d26`
