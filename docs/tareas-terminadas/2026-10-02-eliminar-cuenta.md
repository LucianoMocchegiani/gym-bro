# Eliminar cuenta (app y web)

**Fecha:** 2026-10-02
**Roadmap:** Backlog app afiliado — Eliminar cuenta (requisito App Store 5.1.1(v) y Google Play)
**Commit:** `e73fb29` — feat: eliminar cuenta desde la app y la web
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/e73fb29

## Resumen

La persona puede eliminar su cuenta Faciliter desde la app (Ajustes) y desde la web (`/cuenta`), escribiendo ELIMINAR. La cuenta se anonimiza y nadie vuelve a entrar con ella; cada gym conserva la ficha e historial. Hay una página pública `/cuenta/eliminar` para cargar en Play. Era el último bloqueo de código para enviar a revisión.

## Cambios principales

- API: módulo `account-deletion` con `DELETE /api/me/identity` (cualquier JWT, no impersonado).
- Baja: sale de listas de espera, cancela débitos y reservas futuras, desactiva staff, revoca sesiones, borra avisos y preferencias, anonimiza la identity, audita `identity.delete` (global y por gym) y manda mail.
- App: `DeleteAccountScreen` desde Ajustes; borra la wallet y cierra sesión. `ApiClient.deleteJson`.
- Web: `DeleteAccountPanel` en `/cuenta` del apex; página pública `/cuenta/eliminar`; link en privacidad.
- Docs: RN-CTA-001 a 004, CU-CTA-001 (`05-casos-de-uso/cuenta.md`), `publicar-tiendas.md`, Postman, backlog.

## Decisiones

- Anonimizar en vez de borrar: socios y staff referencian la identity y el gym conserva su registro comercial.
- Dueño de un gym activo: 409 hasta dar de baja o transferir el gym.
- Borrado inmediato; el mismo mail o Google crea una cuenta nueva y vacía.
- Confirmación escribiendo ELIMINAR (igual para contraseña, Google y Apple).
- Revocar Sign in with Apple queda para cuando haya clave `.p8` de Apple Developer.

## Validación

- `tsc` en api y web; `flutter analyze` y `flutter test` OK.
- E2E contra una instancia temporal y la base local: 400 sin ELIMINAR, 401 sin token, 200 con JWT de socio y de identity, sin login ni refresh después, 409 dueño, ficha visible en el gym, cuenta nueva vacía con el mismo mail, mail stub y auditoría.
- Prueba manual en app y web a cargo del usuario (`local/en-testeo/probar-eliminar-cuenta.md`).

## Referencias

- [cuenta.md](../05-casos-de-uso/cuenta.md) · [04-reglas-de-negocio.md](../04-reglas-de-negocio.md) · [publicar-tiendas.md](../mobile/publicar-tiendas.md)
- Commit: `e73fb29`
