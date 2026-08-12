# Casos de uso — Servicios, Sesiones y Packs

**Estado:** Cerrado (v1)  
**Reglas:** RN-SER-*, RN-RES-*, RN-PAG-004  
**Dominio:** Servicio, Pack, Sesion, ReglaRecurrencia, Reserva, ListaEspera, Contratacion

---

## CU-SER-001 Crear servicio

**Actor:** Staff con permiso de catálogo (típicamente Admin)

**Precondiciones:** Tenant activo.

**Flujo principal:**
1. Staff elige tipo: `ACCESO_LIBRE` o `POR_SESIONES`.
2. Completa nombre, descripción, sucursal (si aplica), activo.
3. Sistema crea Servicio.

**Errores:** Sin permiso → denegado.

**Postcondiciones:** Servicio disponible para armar packs/sesiones.

**Reglas relacionadas:** RN-SER-001, RN-SER-002, RN-SER-003

---

## CU-SER-002 Crear / editar pack

**Actor:** Staff con permiso; vencimiento de créditos también profesor si tiene permiso

**Precondiciones:** Servicios componentes existen (si el pack los referencia).

**Flujo principal:**
1. Staff define nombre, precio, periodicidad (mensual u otra).
2. Agrega componentes: acceso libre y/o N créditos de servicio(s) por sesiones.
3. Define política de vencimiento de créditos (si aplica).
4. Define/override política de devolución (o hereda default del gym).
5. Habilita si acepta venta drop-in relacionada (según diseño de oferta).
6. Sistema guarda Pack.

**Errores:** Pack mixto sin componentes → validación.

**Postcondiciones:** Pack publicable para compra.

**Reglas relacionadas:** RN-SER-004, RN-SER-005, RN-SER-006, RN-SER-007, RN-PAG-012

---

## CU-SER-003 Crear sesión puntual

**Actor:** Staff con permiso

**Precondiciones:** Servicio `POR_SESIONES` activo.

**Flujo principal:**
1. Staff elige servicio, fecha/hora, duración, cupo, sucursal.
2. (Recomendado) Asigna profesor.
3. Publica sesión (permite publicar sin profesor).
4. Sistema crea Sesion.

**Postcondiciones:** Sesión visible en calendario para reserva (según visibilidad).

**Reglas relacionadas:** RN-SER-010, RN-SER-011, RN-SER-013

---

## CU-SER-004 Crear regla de recurrencia

**Actor:** Staff con permiso

**Precondiciones:** Servicio `POR_SESIONES`.

**Flujo principal:**
1. Staff define patrón (ej. lunes y miércoles 08:00), cupo, profesor default, rango de fechas o “sin fin” con horizonte de generación.
2. Sistema genera sesiones futuras según regla simple.
3. Staff puede editar/cancelar una sesión individual sin romper toda la serie (comportamiento MVP: excepción local).

**Postcondiciones:** Sesiones materializadas + regla activa.

**Reglas relacionadas:** RN-SER-012

---

## CU-SER-005 Ampliar cupo de sesión

**Actor:** Admin o Profesor con permiso

**Precondiciones:** Sesión existente.

**Flujo principal:**
1. Actor aumenta cupo.
2. Si hay lista de espera, el sistema dispara el flujo de liberación según modo (CU-RES-005).
3. Auditoría.

**Reglas relacionadas:** RN-SER-010, RN-RES-005

---

## CU-RES-001 Reservar sesión (afiliado) — drop-in o con crédito

**Actor:** Afiliado

**Precondiciones:**
- Sesión publicada con cupo libre (o aplica lista de espera → CU-RES-004).
- Afiliado activo.

**Flujo principal:**
1. Afiliado elige sesión en calendario.
2. Sistema determina medio de cobertura:
   - **Crédito** disponible del pack → se reservará consumo de 1 crédito al confirmar.
   - **Drop-in** → requiere pago del precio de sesión.
3. Afiliado confirma e inicia pago si corresponde (MP) o se le indica pagar en caja.
4. Sistema crea Pago `pendiente` con `idempotencyKey` (si hay cobro).
5. Al pasar a `aprobado` (o consumo de crédito sin cobro extra):
   - Crea/confirma Reserva.
   - Descuenta crédito si aplica.
6. Dispara notificación E4.
7. Emite comprobante si hubo pago (RN-PAG-009).

**Flujos alternativos / errores:**
- Sin créditos y sin querer/poder pagar → no reserva.
- Cupo agotado durante el pago → no confirma reserva; libera/reembolsa según política (admin si edge case).
- Pago rechazado → sin reserva confirmada.

**Postcondiciones:** Reserva `confirmada` solo con pago aprobado o crédito consumido válidamente.

**Reglas relacionadas:** RN-RES-001, RN-PAG-004, RN-PAG-005, RN-SER-008

---

## CU-RES-002 Reservar sesión en nombre del afiliado (staff)

**Actor:** Staff con permiso

**Precondiciones:** Afiliado identificado; sesión con cupo (o ampliación previa).

**Flujo principal:**
1. Staff selecciona afiliado y sesión.
2. Elige cobertura: crédito del afiliado, cobro caja, o link/pago MP.
3. Completa cobro según CU de pagos.
4. Confirma reserva al aprobarse el pago / descontar crédito.
5. Auditoría + E4 al afiliado.

**Reglas relacionadas:** RN-RES-002, RN-RES-001

---

## CU-RES-003 Cancelar reserva (afiliado)

**Actor:** Afiliado

**Precondiciones:** Reserva confirmada futura.

**Flujo principal:**
1. Afiliado solicita cancelación.
2. Sistema valida ventana de horas (RN-TEN-005).
3. Cancela reserva; libera cupo.
4. Devuelve crédito si la política del pack/gym lo indica para cancelación a tiempo (detalle de política de crédito en config del pack; si no está definido, default: **devolver crédito** si cancela dentro de ventana).
5. Notificación E5.
6. Dispara lista de espera (CU-RES-005).

**Errores:** Fuera de ventana → no cancela (o solo con staff).

**Reglas relacionadas:** RN-RES-003, RN-TEN-005

---

## CU-RES-004 Anotarse en lista de espera

**Actor:** Afiliado

**Precondiciones:** Sesión sin cupo libre.

**Flujo principal:**
1. Afiliado elige “lista de espera”.
2. Sistema asigna posición FIFO.
3. Confirma inscripción (sin cobro aún, salvo que el gym configure depósito — **no en MVP**).

**Postcondiciones:** Item `en_cola`.

**Reglas relacionadas:** RN-RES-004

---

## CU-RES-005 Liberación de cupo → lista de espera

**Actor:** Sistema (disparado por cancelación o ampliación de cupo)

**Precondiciones:** Hay ListaEsperaItem `en_cola`; hay cupo libre.

**Flujo principal según modo (RN-RES-005):**

**Modo 1 — Auto-asignar:**
1. Toma el primero en cola.
2. Debe poder pagar/consumir crédito de inmediato según mismas reglas que reservar; si no puede, pasa al siguiente.
3. Confirma reserva + notifica E4/E6 según diseño de plantilla.

**Modo 2 — Confirma afiliado:**
1. Oferta cupo al primero (`ofertado`) + E6.
2. Espera confirmación en plazo configurado (incluye pago si aplica).
3. Timeout → `expirado`, oferta al siguiente.

**Modo 3 — Confirma staff:**
1. Notifica a staff; staff confirma candidato.
2. Se completa pago/crédito y reserva.

**Reglas relacionadas:** RN-RES-005, RN-RES-001

---

## CU-RES-006 Ingreso tardío a sesión iniciada

**Actor:** Afiliado o Staff asistiendo el cobro

**Precondiciones:** Política del gym lo permite; hay cupo o se amplía; sesión ya iniciada.

**Flujo principal:**
1. Se intenta reserva/cobro/crédito (igual que CU-RES-001/002).
2. Tras pago/crédito OK, se permite ingreso (CU-ACC).
3. Se marca presente al verificar QR.

**Reglas relacionadas:** RN-RES-006, RN-RES-007

---

## CU-CON-001 Comprar pack / mensualidad (afiliado)

**Actor:** Afiliado

**Precondiciones:** Pack activo publicado.

**Flujo principal:**
1. Afiliado elige pack.
2. Paga (MP) o se deriva a caja.
3. Pago `aprobado` → crea Contratacion con vigencias y créditos (RN-CON-001–004: MONTHLY un plan; renovación día siguiente a `endsAt` si a tiempo o usó tolerancia, si no día de pago; ONE_TIME puede solapar; fechas opcionales en el alta).
4. Comprobante + E1.

**Errores:** Pago rechazado → sin contratación. Otro pack MONTHLY vigente → rechazado (usar ONE_TIME para extras). `startsAt` MONTHLY que solapa → rechazado.

**Reglas relacionadas:** RN-PAG-002, RN-PAG-004, RN-SER-005, RN-CON-001, RN-CON-002, RN-CON-003, RN-CON-004

---

## CU-CON-002 Cancelar pack compuesto (pérdida total de componentes)

**Actor:** Afiliado (solicitud) o Staff con permiso

**Precondiciones:** Contratación activa de pack compuesto.

**Flujo principal:**
1. Actor solicita cancelación (puede encadenar a devolución CU-PAG).
2. Sistema deja sin efecto acceso libre y créditos remanentes del pack.
3. Estado contratación `cancelada` / `reembolsada` según resultado de pago.

**Reglas relacionadas:** RN-SER-009, RN-PAG-011, RN-PAG-012

---

[Índice](../00-indice.md) · [Siguiente: Pagos y caja →](./pagos-caja.md)
