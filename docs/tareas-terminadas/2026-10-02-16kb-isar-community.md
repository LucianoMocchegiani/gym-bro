# App: librerías nativas a 16 KB y wallet en el monorepo

**Fecha:** 2026-10-02
**Roadmap:** Backlog app afiliado — Librerías nativas a 16 KB / Preparar App Store y Play
**Commit:** `a5f4dc3` — feat(mobile): librerias nativas a 16 KB y wallet en el monorepo
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/a5f4dc3

## Resumen

Google Play exige que las `.so` de 64 bits soporten páginas de 16 KB. `libisar.so` (Isar 3.1) y `libsodium.so` (`sodium_libs` 2.2.1) venían a 4 KB y bloqueaban la subida. La wallet pasó a `isar_community` 3.3.2 y sodium 3.4; ahora todas las librerías cumplen. `identity-core-dart` dejó de ser un clon local y se versiona en el monorepo.

## Cambios principales

- `identity-core-dart`: `isar` → `isar_community` 3.3.2; `sodium` 3.4.4 / `sodium_libs` 3.4.5+2.
- Esquemas Isar regenerados con `tool/isar_codegen/generate.ps1` (paquete aislado: el generador 3.3 no convive con freezed 2).
- Sin la dependencia inexistente `flutter_embedding_debug:1.0.0-3.10.0` en su `build.gradle`.
- `mobile/android/build.gradle.kts` sin parches de `namespace` ni `compileSdk`.
- `.gitignore`: `identity-core-dart/` versionado; regla `/identity_core_dart/` anclada (tapaba el Kotlin del plugin).
- Logins web y mobile sin datos precargados; sin chips "Demo" en la app.
- `docs/mobile/comandos-flutter.md`: run vs build, release en el celular, AAB, dart-defines.

## Decisiones

- Wallets creadas con Isar 3.1 pueden no abrirse: se acepta Reiniciar wallet y reemitir (sin usuarios en tienda).
- El paquete se publica en el repo público (confirmado por el usuario).
- sodium con tope `<3.4.6`: desde ahí pide freezed 3; migrar freezed queda fuera.

## Validación

- `zipalign -c -P 16` OK y alineación ELF ≥ 16 KB en todas las `.so` de `arm64-v8a` y `x86_64`.
- `flutter build apk --release` OK; `flutter analyze` de mobile sin issues; `tsc --noEmit` en web.
- Tests de `identity-core-dart`: 83 OK (incluye Isar); 7 fallan por entorno (sin `libsodium.dll` / módulo Node MATTR).
- Prueba manual en el celular a cargo del usuario.

## Referencias

- [isar-wallet.md](../mobile/isar-wallet.md) · [publicar-tiendas.md](../mobile/publicar-tiendas.md) · [comandos-flutter.md](../mobile/comandos-flutter.md)
- Commit: `a5f4dc3`
