# Casos de uso — índice

**Estado:** Cerrado (v1) — módulos MVP redactados  
Los CU usan la plantilla de [00-indice.md](../00-indice.md) y citan IDs de [04-reglas-de-negocio.md](../04-reglas-de-negocio.md).

## Núcleo (lectura rápida)

| ID | Qué hace | Doc |
|----|----------|-----|
| CU-AFI-001 | Registrar afiliado | [afiliados](./afiliados.md) |
| CU-CON-001 | Comprar pack | [servicios-sesiones-packs](./servicios-sesiones-packs.md) |
| CU-RES-001 | Reservar sesión | [servicios-sesiones-packs](./servicios-sesiones-packs.md) |
| CU-PAG-001 | Pago Mercado Pago | [pagos-caja](./pagos-caja.md) |
| CU-PAG-002 | Cobro en caja | [pagos-caja](./pagos-caja.md) |
| CU-ACC-001 | Verificar ingreso (OID4VP) | [acceso-qr](./acceso-qr.md) |
| CU-ACC-004 | Pase manual | [acceso-qr](./acceso-qr.md) |
| CU-ROL-001 | Crear gym (Super) | [roles-permisos](./roles-permisos.md) |

## Módulos

| Archivo | Módulo | Estado |
|---------|--------|--------|
| [afiliados.md](./afiliados.md) | Alta y ficha de afiliados | Cerrado (v1) |
| [servicios-sesiones-packs.md](./servicios-sesiones-packs.md) | Servicios, sesiones, packs, reservas | Cerrado (v1) |
| [pagos-caja.md](./pagos-caja.md) | Mercado Pago, caja, devoluciones | Cerrado (v1) |
| [acceso-qr.md](./acceso-qr.md) | Acceso / QR / SSI | Cerrado (v1) |
| [rutinas.md](./rutinas.md) | Rutinas y progreso | Cerrado (v1) |
| [notificaciones.md](./notificaciones.md) | N1 email + in-app | Cerrado (v1) |
| [roles-permisos.md](./roles-permisos.md) | Roles, permisos, auditoría | Cerrado (v1) |

## Numeración

| Prefijo | Módulo |
|---------|--------|
| CU-AFI | Afiliados |
| CU-SER / CU-RES / CU-CON | Servicios, reservas, contrataciones |
| CU-PAG | Pagos y caja |
| CU-ACC | Acceso |
| CU-RUT | Rutinas |
| CU-NOT | Notificaciones |
| CU-ROL | Roles |

## Nota sobre política de crédito al cancelar reserva

En CU-RES-003 se asume **default: devolver crédito** si la cancelación está dentro de la ventana. Si querés otro default (no devolver / configurable obligatorio), se ajusta en reglas + este CU.

---

[Índice](../00-indice.md) · [Siguiente: Afiliados →](./afiliados.md)
