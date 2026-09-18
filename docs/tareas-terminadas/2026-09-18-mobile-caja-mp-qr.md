# App: checkout MP con QR, + de catálogo y scroll

**Fecha:** 2026-09-18
**Roadmap:** E5 / CU-PAG-001
**Commit:** `e95bbc0` — feat(mobile): MP checkout QR card, catalog +, scroll to QR
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/e95bbc0

## Resumen

Caja staff y el carrito del afiliado muestran el checkout MP como en web (QR, copiar, abrir, limpiar). El catálogo agrega con **+**. Al crear el link, Caja scrollea hasta el QR.

## Cambios principales

- `MpCheckoutShare` + `qr_flutter`
- `CatalogAddButton` en Caja, Tienda y Sesiones (Al carrito)
- Scroll al QR tras crear el link

## Validación

- `fvm flutter analyze` de los archivos tocados: sin issues
- Manual en dispositivo (Caja +)

## Referencias

- Commit: `e95bbc0` / https://github.com/LucianoMocchegiani/gym-bro/commit/e95bbc0
