# Casos de uso — Pagos y Caja

**Estado:** Cerrado (v1)  
**Reglas:** RN-PAG-*, RN-RES-001, RN-SER-009  
**Dominio:** Pago, MovimientoCaja, ArqueoCaja, Comprobante, SolicitudDevolucion

---

## CU-PAG-001 Pagar con Mercado Pago

**Actor:** Afiliado (o Staff generando link/cobro)

**Precondiciones:**
- Tenant con CuentaMercadoPago configurada (MP del gym).
- Concepto: mensualidad/pack/drop-in, o **carrito de Caja** (pack + drop-in en un solo link).

**Flujo principal:**
1. Actor inicia cobro con `idempotencyKey` de negocio (afiliado self-service o Staff en Admin `/caja` con medio Mercado Pago: pack, drop-in, o **carrito** con `items[]`).
2. Sistema crea Pago `pendiente` (carrito: `transactions` + un TransactionItem por ítem, todos con el mismo `transaction_id`).
3. Muestra el link de checkout MP del gym (Staff: copiar u abrir; **sin redirect automático**). Carrito → **un solo link** con el total. Los ítems de la Preference usan el mismo copy que el comprobante GymBro: pack = nombre + servicios/créditos; drop-in = servicio + sede + horario (la vigencia del contrato aún no existe al crear el link).
4. Webhook/confirmación MP → sistema marca `aprobado` o `rechazado` (idempotente; carrito: `externalReference` = `cart_id`).
5. Si `aprobado`: confirma Contratacion y/o Reserva (carrito: **una por cada payment**); **un comprobante interno por Transaction** (total del cart + líneas: pack → contrato/vigencia + servicios del pack; drop-in → reserva/horario); registra quién inició el cobro (staff de Caja); N1 E1.
6. Si `rechazado`: no confirma derechos.

**Errores:**
- MP no configurado → no inicia.
- Webhook duplicado → ignorado por idempotencia.

**Reglas relacionadas:** RN-PAG-001..005, RN-PAG-009

---

## CU-PAG-002 Cobrar en caja

**Actor:** Staff con permiso de caja

**Precondiciones:** Afiliado y concepto identificados; monto conocido.

**Flujo principal:**
1. Staff registra cobro (efectivo u otro medio presencial habilitado).
2. Sistema crea Pago `aprobado` (presencial) con idempotencyKey.
3. Crea MovimientoCaja del día.
4. Confirma Contratacion/Reserva según concepto.
5. **Un comprobante** por Transaction (total del cart) con líneas (pack → contrato/vigencia + servicios del pack; drop-in → reserva/horario). Staff lo ve en Caja (panel + “Ver comprobante”), igual que tras un cobro MP aprobado. + E1.
6. Auditoría.

**Errores:** Sin permiso → denegado.

**Reglas relacionadas:** RN-PAG-007, RN-PAG-008, RN-PAG-004

---

## CU-PAG-003 Consultar caja del día y arquear

**Actor:** Staff con permiso de caja/arqueo

**Precondiciones:** Fecha operativa.

**Flujo principal:**
1. Staff abre caja del día: listado de movimientos (1 fila por cobro o devolución de cart; misma grilla que Reportes) y totales.
2. Staff declara monto contado.
3. Sistema calcula esperado vs declarado → diferencia.
4. Guarda ArqueoCaja + auditoría.

**Postcondiciones:** Arqueo registrado (no bloquea cobros futuros del día salvo política futura).

**Reglas relacionadas:** RN-PAG-007

---

## CU-PAG-004 Solicitar devolución (afiliado)

**Actor:** Afiliado

**Precondiciones:** Pago `aprobado` propio.

**Flujo principal:**
1. Afiliado inicia solicitud sobre un pago/contratación.
2. Sistema evalúa política del gym/pack (defaults RN-PAG-012).
3. Si cumple → SolicitudDevolucion `pendiente` o auto-aprobable según config (MVP: **pendiente de staff** recomendado).
4. Notifica admin (N1).
5. Si no cumple política → rechaza solicitud con motivo (admin igual puede devolver por CU-PAG-005).

**Reglas relacionadas:** RN-PAG-012

---

## CU-PAG-005 Ejecutar devolución (staff)

**Actor:** Staff con flag peligroso de devoluciones

**Precondiciones:** Pago aprobado; motivo informado.

**Flujo principal:**
1. Staff aprueba una solicitud o inicia devolución desde Cierres (picker del cart).
2. Sistema:
   - Marca los `transaction_items` elegidos `reembolsado` (lote del cart; se puede devolver una parte ahora y el resto después).
   - Revierte derechos de cada ítem: cancelar contratación/reserva; pack compuesto → pierde todo (RN-SER-009).
   - Si fue MP: un refund contra el `payment_id` del cart (total del saldo o parcial por la suma) o marca “reembolso manual pendiente” si la API falla.
   - Caja (CASH y MP): egresos por ítem agrupados en **una** fila de ejecución + **un** comprobante `REFUND`.
3. Comprobante de devolución + E9.
4. Auditoría.

**Reglas relacionadas:** RN-PAG-011, RN-PAG-006, RN-SER-009, RN-ROL-007

---

## CU-PAG-006 Configurar cuenta Mercado Pago del gym

**Actor:** Admin

**Flujo principal:**
1. Admin conecta/credencializa MP del gym.
2. Sistema guarda CuentaMercadoPago.
3. Prueba opcional.

**Reglas relacionadas:** RN-PAG-001

---

## CU-PAG-007 Reembolso por cobro duplicado

**Actor:** Staff con flag de devoluciones

**Precondiciones:** Detectado segundo cobro (soporte/alerta) pese a idempotencia.

**Flujo principal:**
1. Staff identifica pago duplicado.
2. Ejecuta CU-PAG-005 sobre el duplicado.
3. Auditoría con motivo `doble_cobro`.

**Reglas relacionadas:** RN-PAG-005, RN-PAG-006

---

[Índice](../00-indice.md) · [Siguiente: Acceso / QR →](./acceso-qr.md)
