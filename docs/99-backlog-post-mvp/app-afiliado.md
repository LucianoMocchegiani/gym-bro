# Backlog — App afiliado

**Índice:** [99-backlog-post-mvp.md](../99-backlog-post-mvp.md)

## Hecho (E9, 2026-08-31)

- Tienda: packs + drop-in, `CatalogCard`, carrito MP (`POST /me/transaction-items/mp/cart`).
- Historial: un comprobante por transacción + solicitar devolución.
- Sesiones: calendario mensual, crédito o drop-in al carrito, Mis clases.

## Hecho (Identity)

- Corte A: cuenta Faciliter + picker de gym.
- Corte B: Google (`POST /auth/google`). Corte C: Apple (`POST /auth/apple`). Login Google/Apple en **Admin web**: después.

## Pendiente

| Ítem | Estado | Notas |
|------|--------|--------|
| Historial de packs de otros períodos | Pendiente | Inicio solo vigencia **hoy** (`coverage=current`). UI + `coverage=all` o endpoint dedicado. No es el Historial de comprobantes (eso ya está) |
| Paginación de comprobantes | Pendiente | Hoy lista hasta 50 |
| Productos en Tienda | Pendiente | Misma `CatalogCard`; módulo shop → [producto.md](./producto.md) |
| Tickets de reclamo (IA) | Pendiente | Abrir un reclamo desde la app; la IA lleva el hilo (estilo ML/MP). Inbox Admin: [admin.md](./admin.md) |
| Crashlytics (Firebase) | En curso | Código listo (solo release, tolerante sin config). Falta crear las apps en Firebase y commitear la config. [publicar-tiendas.md](../mobile/publicar-tiendas.md) |
| Preparar App Store y Play | En curso | Firma, permisos iOS, entitlements, fichas en borrador. Faltan cuentas y consolas. [publicar-tiendas.md](../mobile/publicar-tiendas.md) |
| Eliminar cuenta | Hecho | App (Ajustes) + web `/cuenta/eliminar`; `DELETE /api/me/identity` anonimiza. RN-CTA, [CU-CTA-001](../05-casos-de-uso/cuenta.md). Pendiente: revocar Sign in with Apple (con la clave `.p8`) |
| Versión mínima / aviso de actualización | Hecho | `GET /api/public/app-config` + `APP_MIN_BUILD_*` / `APP_LATEST_BUILD_*`. Bloquea debajo del mínimo, sugiere una vez debajo del último. [publicar-tiendas.md](../mobile/publicar-tiendas.md#7-actualizaciones-y-versión-mínima) |
| Librerías nativas a 16 KB | Hecho | `isar_community` 3.3.2 + `sodium_libs` 3.4.x; `identity-core-dart` versionado. [isar-wallet.md](../mobile/isar-wallet.md) |

## Mejoras de UX (charla)

| Ítem | Estado | Notas |
|------|--------|--------|
| Devolución detrás de ⋮ | Pendiente | En Historial, no un botón grande “Solicitar devolución” en cada card |
| Ajustes como menú | Pendiente | Cuenta → pantalla cuenta; Wallet → solo reiniciar; Sistema → tema + API **solo en debug** |
| Ocultar detalles de API en Ajustes | Hecho | "Desarrolladores" solo en debug o con `CRASH_TEST` |

Rutinas y avisos de la app: [roadmap E7/E8](../11-roadmap-mvp.md).

[Índice post-MVP](../99-backlog-post-mvp.md)
