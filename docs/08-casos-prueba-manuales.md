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
| A4 | Staff ve credential offers en ficha | Lista status + lastError; copiar URI | E6 OID4VCI | |
| A5 | Staff re-emite offer | Misma key; nuevo PENDING/URI (o soft-fail) | E6 OID4VCI | |

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
| R13 | App: día del calendario, crédito o drop-in al carrito | Reserva o ítem en carrito; no se entra a un mes anterior al actual | CU-RES-001/004 | |

---

## Pagos / caja

| # | Caso | Esperado | RN/CU | R |
|---|------|----------|-------|---|
| P1 | MP rechazado | Sin contratación | CU-PAG-001 | |
| P2 | Webhook duplicado MP | No duplica derechos | RN-PAG-005 | |
| P3 | Cobro caja sin permiso | Denegado | RN-PAG-008 | |
| P3b | Staff genera link MP pack en Caja | Preference + PENDING; ítem MP = nombre del pack + servicios/créditos; derechos al APPROVED | CU-PAG-001 | |
| P3c | Staff genera link MP drop-in en Caja | Preference + PENDING; ítem MP = servicio · sede · horario (dos drop-ins del mismo servicio se distinguen); reserva al APPROVED | CU-PAG-001 | |
| P3d | Staff genera link MP de carrito en Caja | Sin redirect automático; al webhook APPROVED aparece “Ver comprobante” (1 receipt por cart) y Staff = quien generó el link | CU-PAG-001 | |
| P3e | Staff cobra carrito en efectivo en Caja | APPROVED inmediato; panel con líneas (pack → contrato/vigencia + servicios del pack; drop-in → reserva/horario) | CU-PAG-002 | |
| P3f | Afiliado paga carrito MP desde la app (pack y/o drop-in) | `POST /me/transaction-items/mp/cart` → 1 Preference; mismos derechos al APPROVED que Caja; sin cash en el celular | CU-PAG-001 | |
| P4 | Comprobante tras pago | Visible app + email E1; en reportes y cierres, “Ver comprobante” abre el panel (pack incluye servicios) | RN-PAG-009 | |
| P5 | Devolución afiliado dentro de política | Solicitud OK | CU-PAG-004 | |
| P6 | Devolución afiliado fuera de política | Rechazo; admin aún puede | RN-PAG-012/011 | |
| P7 | Admin devolución cart (parcial o todo) | Derechos de los ítems elegidos caen; un egreso + un comprobante REFUND; se puede devolver el resto después | CU-PAG-005 | |
| P8 | Arqueo con diferencia | Se registra diff; la grilla de Cierre es la misma que Reportes (categoría + tipo + staff + comprobante) | CU-PAG-003 | |

### Débito automático (post-MVP — diseño; no correr hasta implementar)

| # | Caso | Esperado | RN/CU | R |
|---|------|----------|-------|---|
| P9 | Tilde débito con carrito mixto o CASH | No hay checkbox | RN-PAG-014 | |
| P9b | Cobro MP 1 MONTHLY + tilde | Tokeniza, cobra el mes, mandato activo; auditoría | CU-PAG-008 | |
| P9c | Socio con MONTHLY efectivo: autorizar tarjeta | Sin cobro; job en `endsAt` | CU-PAG-008 | |
| P9d | Job el día de `endsAt` | Precio catálogo actual; contrato nuevo; no duplica si PENDING | CU-PAG-009 | |
| P9e | MP rechaza 3 veces (día 0, +1, +2) | Mandato fallido; tolerancia/deuda como hoy | RN-PAG-015 | |
| P9f | Baja débito | No cobra de nuevo; contrato vigente sigue | CU-PAG-010 | |
| P9g | Devolver cobro que inscribió | Mandato a baja | RN-PAG-016 | |
| P9h | Ficha → Caja débitos | `/caja?memberId=&vista=debitos`; no hay UI de mandato en la ficha | CU-AFI-004 | |

---

## Acceso

| # | Caso | Esperado | RN/CU | R |
|---|------|----------|-------|---|
| X1 | Deuda 10 días / tolerancia 15 | Permitido (`ok_deuda_tolerancia`) | RN-ACC-005 | |
| X2 | Deuda 16 días | Denegado (`deuda_excedida`) | RN-ACC-005 | |
| X3 | Pase manual con deuda | Permitido + auditoría | CU-ACC-004 | |
| X3b | Pase manual + sesión (reserva CONFIRMED hoy) | Permitido + presente en sesión | CU-ACC-004 | |
| X3c | Pase manual sin sesión | Permitido; sin marcar presente | CU-ACC-004 | |
| X11 | Staff presenta VC acceso | ALLOWED `ok_staff` | E6 staff SSI | |
| X12 | Staff inactivo presenta VC | DENIED `staff_inactivo` | E6 staff SSI | |
| X4 | Multi-ingreso deshabilitado | Segundo ingreso deny | RN-ACC-009 | |
| X5 | Credencial revocada | Deny | CU-AFI-003/006 | |
| X6 | Historial muestra motivos | Lista ok/deny | CU-ACC-005 | |
| X13 | GET access-preview (allow/deny) | 200 + `reasonCode`; **sin** fila nueva en historial | C0 chat/MCP | |
| X7 | Ingreso tardío si política ON | Paga/crédito + entra | CU-RES-006 | |
| X8 | Renovar MONTHLY a tiempo | `startsAt` = día después de `endsAt` previo | RN-CON-001 | |
| X9 | Renovar tras hueco sin ingresos | `startsAt` ≈ día de pago | RN-CON-001 | |
| X10 | Renovar tras usar tolerancia | `startsAt` = día después de `endsAt` previo | RN-CON-001 | |

---

## Asistente MCP (post-MVP — C3; sin drawer)

| # | Caso | Esperado | RN/CU | R |
|---|------|----------|-------|---|
| M1 | `GET http://localhost:3011/health` | 200 `{ status: "ok" }` sin auth | C3 | |
| M2 | `POST /mcp` sin Bearer | 401 | C3 | |
| M3 | `npm run smoke` con JWT Staff | tools A + `search_members` JSON slim | C3 | |
| M4 | `get_cash_day` con staff sin `cashier.operate` | tool error “no hay permiso” | C3 / RN-ROL-007 | |
| M5 | `preview_member_access` | mismas RN que puerta; **sin** fila en `access_attempts` | C0/C3 | |

---

## Asistente chat-api (post-MVP — C4; sin drawer)

| # | Caso | Esperado | RN/CU | R |
|---|------|----------|-------|---|
| C4-1 | `POST /v1/conversations/:id/messages` `{ "text" }` con JWT Staff | stream SSE (UI Message Stream); usa tools MCP | C4 | |
| C4-2 | `GET /v1/conversations/:id/messages` | `items[]` user + assistant/tool | C4 | |
| C4-3 | POST sin Bearer / JWT Member | 401 / 403 | C4 | |
| C4-4 | POST hilo archivado | 409 | C4 | |

---

## Asistente Admin (post-MVP — C5 drawer)

| # | Caso | Esperado | RN/CU | R |
|---|------|----------|-------|---|
| C5-1 | Staff en `demo.localhost:3002`, botón Asistente | Abre drawer; Caja sigue detrás | C5 | |
| C5-2 | Primer uso / sin hilos | Vacío + composer; enviar crea hilo y stremea | C5 | |
| C5-3 | Reabrir drawer | Último hilo + historial (tools en una línea) | C5 | |
| C5-4 | Archivar hilo | Sale de la lista; si era el activo, abre otro o vacío | C5 | |
| C5-5 | Disclaimer | “Puede equivocarse; no cobra solo.” | C5 | |

---

## Asistente MCP lectura amplia (post-MVP — C6)

| # | Caso | Esperado | RN/CU | R |
|---|------|----------|-------|---|
| C6-1 | `npm run smoke` con JWT Admin seed | 17 tools; `get_reports_summary` sin args = mes BA; `get_help` packs | C6 | |
| C6-2 | Drawer: “ingresos de este mes” | Tool reportes + una línea; totales del mes | C6 | |
| C6-3 | Drawer: “qué packs hay” / “cómo enrolar débito” | `list_packs` / `get_help` debito | C6 | |
| C6-4 | Staff sin caja: débitos o caja | Tool “No hay permiso para esta consulta.” | C6 | |

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
