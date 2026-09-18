# Caja: card de link MP con QR y limpiar

**Fecha:** 2026-09-18
**Roadmap:** E5 / CU-PAG-001
**Commit:** `36f7f59` — feat(web): MP checkout card with QR, copy, and clear
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/36f7f59

## Resumen

El checkout de Caja muestra QR, URL recortada, copiar/abrir y estado. Cancelar y limpiar vacía link, carrito y afiliado en la UI (no anula la preference en MP).

## Cambios principales

- Componente `MpCheckoutShare`
- Confirmación al cancelar un link pendiente
- CU-PAG-001 y caso P3d2

## Decisiones

- QR + copiar juntos; un solo botón de limpiar (incluye afiliado)

## Validación

- Typecheck web
- Prueba en Caja (QR, copiar, cancelar)

## Referencias

- `docs/05-casos-de-uso/pagos-caja.md`
- Commit: `36f7f59` / https://github.com/LucianoMocchegiani/gym-bro/commit/36f7f59
