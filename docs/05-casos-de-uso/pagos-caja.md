# Casos de uso — Pagos y Caja

**Estado:** Cerrado (v1)  
**Reglas:** RN-PAG-*, RN-RES-001, RN-SER-009  
**Dominio:** Pago, MovimientoCaja, ArqueoCaja, Comprobante, SolicitudDevolucion, MandatoDebito

---

## CU-PAG-001 Pagar con Mercado Pago

**Actor:** Afiliado (o Staff generando link/cobro)

**Precondiciones:**
- Tenant con CuentaMercadoPago configurada (MP del gym).
- Concepto: mensualidad/pack/drop-in, o **carrito de Caja** (pack + drop-in en un solo link).

**Flujo principal:**
1. Actor inicia cobro con `idempotencyKey` de negocio (afiliado self-service en la app con `POST /me/transaction-items/mp/cart`, o Staff en Admin `/caja` con medio Mercado Pago: pack, drop-in, o **carrito** con `items[]`).
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
1. Staff abre **Cierre** (`/arqueo`): listado de movimientos (1 fila por cobro o devolución; misma grilla que Reportes, con categoría Venta/Devolución y tipo Ingreso/Egreso) y totales.
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
1. Staff aprueba una solicitud (Solicitudes de devolución) o inicia devolución desde Cierre (picker del cart).
2. Sistema:
   - Marca los `transaction_items` elegidos `reembolsado` (lote del cart; se puede devolver una parte ahora y el resto después).
   - Revierte derechos de cada ítem: cancelar contratación/reserva; pack compuesto → pierde todo (RN-SER-009).
   - Si fue MP: un refund contra el `payment_id` del cart (total del saldo o parcial por la suma) o marca “reembolso manual pendiente” si la API falla.
   - Caja (CASH y MP): egresos por ítem agrupados en **una** fila de ejecución + **un** comprobante `REFUND`.
3. Comprobante de devolución + E9.
4. Si se devuelve el cobro que **inscribió** un mandato de débito → baja automática del mandato (RN-PAG-016).
5. Auditoría.

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

## CU-PAG-008 Alta de débito automático

**Actor:** Staff con permiso de caja

**Precondiciones:** Cuenta MP del gym. Pack `MONTHLY`. Staff Caja.

**Flujo principal (cobro + alta):**
1. En Caja, afiliado elegido, carrito = **un** pack MONTHLY, medio **Mercado Pago**.
2. Staff tilda débito automático (consentimiento a la vista) y cobra.
3. Checkout tokeniza la tarjeta (Customer + Card en la cuenta del gym), crea el cobro del mes (mismo pipeline CU-PAG-001) y, al APPROVED, deja MandatoDebito `activo`.
4. Auditoría: quién tildó, cuándo, pack, afiliado.

**Flujo alternativo (solo autorización):**
1. El afiliado ya tiene MONTHLY vigente (p. ej. pagó en efectivo) y no hay tarjeta.
2. Staff abre pestaña Débitos (o llega desde la ficha: `/caja?memberId=&vista=debitos`).
3. “Autorizar tarjeta” **sin** cobrar el mes. Al guardar la tarjeta → mandato `activo`. El job cobra en el `endsAt` actual.

**Errores:**
- Carrito mixto, más de un ítem, o no MONTHLY → no hay checkbox.
- Medio efectivo → no hay checkbox (RN-PAG-014).
- MP no configurado / tokenización rechazada → no hay mandato; el cobro del mes sigue las reglas de CU-PAG-001 si ya se inició.

**Postcondiciones:** Mandato activo o nada. Contrato del mes solo si hubo pago APPROVED.

**Reglas relacionadas:** RN-PAG-013, RN-PAG-014, RN-CON-001

---

## CU-PAG-009 Ejecutar débito (job o cobrar ahora)

**Actor:** Sistema (job) o Staff (Caja)

**Precondiciones:** Mandato `activo` o `reintentando`; tarjeta guardada; día de cobro = `endsAt` del contrato vigente o reintento (+1 / +2 días).

**Flujo principal:**
1. Job (timezone del gym) o staff “Cobrar ahora”.
2. Idempotencia por periodo: `mandato + endsAt`. Si ya hay PENDING o APPROVED de ese periodo → no duplica (RN-PAG-005).
3. Crea Transaction del pack del mandato al **precio de catálogo actual** → Payment MP con la tarjeta guardada (sin Preference de link).
4. Webhook APPROVED → contrato nuevo (RN-CON-001) + comprobante; mandato sigue `activo`; próximo cobro = nuevo `endsAt`.
5. Rechazo: mandato `reintentando` o `fallido` (si era el 3.er intento); Caja muestra el error; aplica RN-ACC-005 si el pack ya venció.

**Errores:** Tarjeta vencida / fondos / MP → fallo visible en pestaña Débitos. No se crea contrato.

**Reglas relacionadas:** RN-PAG-015, RN-PAG-004, RN-PAG-005, RN-CON-001, RN-ACC-005

---

## CU-PAG-010 Gestionar mandato (cola, baja, cambio de pack)

**Actor:** Staff con permiso de caja

**Precondiciones:** Caja.

**Flujo principal:**
1. Pestaña **Débitos**: lista a debitar hoy, reintentos, fallidos. Elegir fila abre el panel del afiliado (mismo que si `?memberId=&vista=debitos`).
2. Panel: estado, pack del próximo cobro, último error, “Cobrar ahora” (CU-PAG-009), “Dar de baja”, “Próximo pack” (B).
3. Baja → mandato `baja`; contrato vigente no se toca.
4. Cambio de pack → el job del próximo `endsAt` cobra B; A se deja vencer (sin dos MONTHLY a la vez).
5. Ficha del afiliado: no duplica esta UI; atajo a este flujo (CU-AFI-004).

**Errores:** Sin permiso → denegado.

**Reglas relacionadas:** RN-PAG-013, RN-PAG-016, RN-PAG-008

---

[Índice](../00-indice.md) · [Siguiente: Acceso / QR →](./acceso-qr.md)
