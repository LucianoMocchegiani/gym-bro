# GymBro — Glosario

**Estado:** Cerrado (v1)  
**Fuente:** [01-documento-maestro.md](./01-documento-maestro.md)

Términos usados en dominio, reglas y casos de uso. Una sola palabra canónica por concepto.

---

## Plataforma y tenant

| Término | Definición |
|---------|------------|
| **GymBro** | Nombre provisorio de la plataforma SaaS. |
| **Tenant / Gimnasio** | Cliente de la plataforma: un gym o estudio con datos aislados. |
| **Sucursal** | Sede física del tenant. En MVP el modelo la contempla (S2); la UI opera con una sede visible. |
| **Super Administrador** | Usuario de la plataforma GymBro (no del gym): alta/suspensión de tenants, soporte. |
| **Staff** | Usuario del tenant con roles de trabajo (admin, profesor, recepción custom, etc.). |
| **Afiliado** | Socio del gym; consume servicios y usa la app de autogestión. |
| **Perfil** | Identidad de uso en el sistema. Una persona física puede tener perfil afiliado y perfil staff **por separado**. |

---

## Comercial (qué vende el gym)

| Término | Definición |
|---------|------------|
| **Servicio** | Producto de catálogo del gym. Tipos: `ACCESO_LIBRE` o `POR_SESIONES`. |
| **Acceso libre** | Derecho a ingresar en horarios del gym sin reservar sesión (según contratación y reglas). |
| **Sesión** | Instancia calendarizada de un servicio por sesiones (fecha, hora, cupo, profesor, sucursal). |
| **Pack** | Oferta comercial que empaqueta uno o más derechos (libre, créditos de sesiones, o mixto). |
| **Pack compuesto / mixto** | Pack que combina acceso libre + créditos (u otros servicios). Cancelarlo implica perder todo el pack. |
| **Crédito** | Unidad que se consume al confirmar una reserva/uso de sesión cubierta por un pack. |
| **Drop-in** | Compra/pago de una sola sesión suelta (sin pack de créditos). |
| **Contratación** | Vínculo activo entre afiliado y un pack/servicio pagado (mensualidad, créditos, etc.). |
| **Oferta** | Configuración de precio y modalidad de cobro de un servicio o pack. |

---

## Reservas y asistencia

| Término | Definición |
|---------|------------|
| **Reserva** | Lugar confirmado de un afiliado en una sesión (requiere pago aprobado cuando aplica). |
| **Lista de espera** | Cola cuando la sesión está llena; al liberarse cupo aplica el modo configurado por el gym. |
| **Cupo** | Capacidad máxima de una sesión; admin/profesor pueden ampliarla. |
| **Recurrencia** | Regla que genera muchas sesiones (ej. “lunes 8:00”). MVP: reglas simples. |
| **Presente / Asistencia** | Se registra al **verificar el ingreso con QR** asociado a la sesión u acceso libre. |
| **Cancelación de reserva** | Baja de una reserva dentro de la ventana de horas definida por el gym. |

---

## Pagos y caja

| Término | Definición |
|---------|------------|
| **Pago** | Intento o cobro registrado (MP o caja) con estado. |
| **Mercado Pago (MP)** | Medio online; la cuenta es **del gym** (tenant). |
| **Caja** | Cobros presenciales (efectivo u otros habilitados) operados por staff. |
| **Caja del día** | Conjunto de movimientos de caja de una fecha + arqueo. |
| **Arqueo** | Control de lo esperado vs lo declarado en caja del día. |
| **Idempotencia** | Garantía de que la misma operación de cobro no se ejecuta dos veces. |
| **Comprobante interno** | Recibo GymBro (no factura AFIP). AFIP = post-MVP. |
| **Devolución / Reembolso** | Reverso de un pago según política del gym o decisión del admin. |
| **Tolerancia** | Días de atraso de deuda con los que aún se permite ingreso. Default 15; por gym. |

---

## Acceso

| Término | Definición |
|---------|------------|
| **Ingreso** | Intento de entrar al gym (ok o deny) con motivo e historial. |
| **QR / Credencial** | Medio de presentación de identidad en la puerta. |
| **SSI** | Self-Sovereign Identity; en MVP vía Quark como proveedor. |
| **Adapter de acceso** | Capa intercambiable (SSI u otro) que identifica al afiliado; GymBro aplica reglas. |
| **Credencial de vínculo** | Una credencial SSI “afiliado X del gym Y”; los packs no van dentro de la credencial (MVP). |
| **Pase manual** | Autorización de ingreso por staff con permiso, sin pasar la regla automática. |

---

## Rutinas

| Término | Definición |
|---------|------------|
| **Ejercicio (catálogo)** | Ítem del catálogo **del gym** (no global en MVP). |
| **Plantilla de rutina** | Rutina modelo (N días) reutilizable. |
| **Rutina asignada (copia)** | Copia personal del afiliado al asignar; no se pisa si cambia la plantilla. |
| **Cumplimiento** | Marca de hecho, descansos y tiempo de ejecución registrados por el afiliado. |
| **Medición / Foto de progreso** | Datos opcionales de seguimiento corporal. |

---

## Notificaciones y permisos

| Término | Definición |
|---------|------------|
| **N1** | Nivel MVP de notificaciones: **email** + registro **in-app**. |
| **Plantilla de notificación** | Texto editable por el gym para un evento. |
| **Rol** | Conjunto de permisos con scope en el gym. |
| **Permiso / Flag** | Capability (ej. operar caja, devolver, pase manual). |
| **Flag peligroso** | Permiso explícito para acciones sensibles (devoluciones, borrados, exports). |
| **Auditoría** | Registro de quién hizo qué en acciones relevantes. |

---

## Abreviaturas

| Sigla | Significado |
|-------|-------------|
| MVP | Minimum Viable Product (alcance de la primera versión vendible) |
| SaaS | Software as a Service |
| SSI | Self-Sovereign Identity |
| MP | Mercado Pago |
| CU | Caso de uso |
| S2 | Estrategia sucursales: modelo con entidad Sucursal, UI de una sede en MVP |

---

[Índice](./00-indice.md) · [Siguiente: Modelo de dominio →](./03-modelo-dominio.md)
