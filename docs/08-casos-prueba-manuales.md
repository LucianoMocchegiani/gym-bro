# GymBro — Casos de prueba manuales

**Estado:** Cerrado (v1)  
**Quién ejecuta:** vos + socio (sin tests de código en esta doc)  
**Cómo usar:** marcar Pass/Fail/N/A; citar bug con ID de RN/CU.

Leyenda resultado: `P` pass · `F` fail · `B` bloqueado · `-` no aplica

---

## Smoke MVP (orden sugerido)

| # | Caso | RN / CU | P/F |
|---|------|---------|-----|
| S1 | Super Admin crea tenant + admin + sucursal seed | CU-ROL-001 | |
| S2 | Admin crea servicio libre + servicio GAP + pack mixto | CU-SER-001/002 | |
| S3 | Admin crea sesión GAP con cupo 2 | CU-SER-003 | |
| S4 | Alta afiliado A y B | CU-AFI-001 | |
| S5 | A compra pack mixto por MP (sandbox) | CU-CON-001, CU-PAG-001 | |
| S6 | A reserva GAP usando crédito | CU-RES-001 | |
| S7 | A ingresa con QR → permitido + presente en sesión | CU-ACC-001/003 | |
| S8 | B intenta ingresar sin pack → denegado con motivo | CU-ACC-001 | |
| S9 | Staff cobro caja drop-in para B + reserva | CU-PAG-002, CU-RES-002 | |
| S10 | Arqueo del día | CU-PAG-003 | |

---

## Afiliados

| # | Caso | Esperado | RN/CU | R |
|---|------|----------|-------|---|
| A1 | Alta con email duplicado | Rechaza o avisa según regla implementada | CU-AFI-001 | |
| A2 | Baja afiliado | No ingresa; auditoría | CU-AFI-003 | |
| A3 | Afiliado ve solo su cuenta | No ve datos de otros | CU-AFI-005, RN-TEN-001 | |

---

## Servicios / reservas

| # | Caso | Esperado | RN/CU | R |
|---|------|----------|-------|---|
| R1 | Reservar sin pago aprobado | No queda confirmada | RN-RES-001 | |
| R2 | Doble click pagar misma reserva | Un solo cobro (idempotencia) | RN-PAG-005 | |
| R3 | Cancelar dentro de ventana | Libera cupo; crédito devuelto (default) | CU-RES-003 | |
| R4 | Cancelar fuera de ventana | No puede (afiliado) | RN-RES-003 | |
| R5 | Sesión llena → lista espera | Posición FIFO | CU-RES-004 | |
| R6 | Cancelación + modo auto lista espera | Primero en cola obtiene cupo si puede pagar/crédito | CU-RES-005 | |
| R7 | Modo confirma afiliado + timeout | Pasa al siguiente | CU-RES-005 | |
| R8 | Ampliar cupo con cola | Dispara liberación | CU-SER-005 | |
| R9 | Publicar sesión sin profe | OK | RN-SER-011 | |
| R10 | Recurrencia genera N sesiones | Sesiones materializadas | CU-SER-004 | |
| R11 | Cancelar pack mixto | Pierde libre y créditos | RN-SER-009 | |
| R12 | Sin créditos → compra otro pack | Puede comprar | RN-SER-008 | |

---

## Pagos / caja

| # | Caso | Esperado | RN/CU | R |
|---|------|----------|-------|---|
| P1 | MP rechazado | Sin contratación | CU-PAG-001 | |
| P2 | Webhook duplicado MP | No duplica derechos | RN-PAG-005 | |
| P3 | Cobro caja sin permiso | Denegado | RN-PAG-008 | |
| P4 | Comprobante tras pago | Visible app + email E1 | RN-PAG-009 | |
| P5 | Devolución afiliado dentro de política | Solicitud OK | CU-PAG-004 | |
| P6 | Devolución afiliado fuera de política | Rechazo; admin aún puede | RN-PAG-012/011 | |
| P7 | Admin devolución pack mixto | Derechos caen todos | CU-PAG-005 | |
| P8 | Arqueo con diferencia | Se registra diff | CU-PAG-003 | |

---

## Acceso

| # | Caso | Esperado | RN/CU | R |
|---|------|----------|-------|---|
| X1 | Deuda 10 días / tolerancia 15 | Permitido (`ok_deuda_tolerancia`) | RN-ACC-005 | |
| X2 | Deuda 16 días | Denegado (`deuda_excedida`) | RN-ACC-005 | |
| X3 | Pase manual con deuda | Permitido + auditoría | CU-ACC-004 | |
| X4 | Multi-ingreso deshabilitado | Segundo ingreso deny | RN-ACC-009 | |
| X5 | Credencial revocada | Deny | CU-AFI-003/006 | |
| X6 | Historial muestra motivos | Lista ok/deny | CU-ACC-005 | |
| X7 | Ingreso tardío si política ON | Paga/crédito + entra | CU-RES-006 | |
| X8 | Renovar MONTHLY a tiempo | `startsAt` = día después de `endsAt` previo | RN-CON-001 | |
| X9 | Renovar tras hueco sin ingresos | `startsAt` ≈ día de pago | RN-CON-001 | |
| X10 | Renovar tras usar tolerancia | `startsAt` = día después de `endsAt` previo | RN-CON-001 | |

---

## Rutinas

| # | Caso | Esperado | RN/CU | R |
|---|------|----------|-------|---|
| U1 | Asignar rutina | Copia creada; E7 | CU-RUT-003 | |
| U2 | Editar plantilla | No cambia copia vieja | RN-RUT-005 | |
| U3 | Varias rutinas activas | Ambas visibles | RN-RUT-004 | |
| U4 | Registrar cumplimiento + tiempo | Persistido | CU-RUT-006 | |
| U5 | Sin mediciones | App usable igual | RN-RUT-007 | |

---

## Notificaciones

| # | Caso | Esperado | RN/CU | R |
|---|------|----------|-------|---|
| N1 | Pago aprobado | Email + in-app | E1 | |
| N2 | Gym apaga E7 | No envía rutina asignada | RN-NOT-003 | |
| N3 | Afiliado apaga E7 | No recibe | CU-NOT-003 | |
| N4 | Editar plantilla | Siguiente envío usa texto nuevo | CU-NOT-002 | |
| N5 | Branding nombre gym | Visible en mail | RN-NOT-004 | |

---

## Roles

| # | Caso | Esperado | RN/CU | R |
|---|------|----------|-------|---|
| L1 | Profe sin flag devolución | No puede devolver | RN-ROL-007 | |
| L2 | Usuario con 2 roles | Unión de permisos | RN-ROL-004 | |
| L3 | Perfil afiliado ≠ sesión staff | Separados | RN-ROL-005 | |
| L4 | Alcance profe “todos” | Ve listado completo | RN-TEN-008 | |
| L5 | Alcance restringido | Solo vinculados a sus sesiones/rutinas | RN-TEN-008 | |

---

## Registro de corridas

| Fecha | Build/ambiente | Tester | Notas |
|-------|----------------|--------|-------|
| | | | |

---

## Criterio de salida MVP (doc)

Smoke S1–S10 en `P` + sin `F` abiertos en reglas críticas: RN-RES-001, RN-PAG-004/005, RN-ACC-005, RN-SER-009, RN-TEN-001.

---

[Índice](./00-indice.md) · [Siguiente: Método de definición →](./10-metodo-definicion-producto.md)
