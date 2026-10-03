# Faciliter — Casos de prueba manuales

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
| A5 | Staff re-emite offer | `POST /members/:id/credential-offers` (`packId` opcional); offer del pack que cubre hoy; nuevo PENDING (o soft-fail); no cobra | E6 OID4VCI | |
| A6 | Importar en gym Kuatia | No aparece el paso "3. Números del aparato ZKTeco"; `POST /member-imports/access-codes/preview` → 409 | RN-MIG-006 | |
| A7 | Importar números (gym ZKTeco): DNI con puntos y mail en mayúsculas | Revisión "Se vinculan"; tras confirmar, la ficha muestra el número en Acceso ZKTeco; corrida "Números de acceso" en Últimas importaciones | RN-MIG-006 | |
| A8 | Planilla con socio inexistente, número inválido, repetido o de un staff | Cada fila sale "Con error" con motivo; CSV descargable; no se vincula nada de esas filas | RN-MIG-006 | |
| A9 | Re-subir la misma planilla de números | Todo "Ya estaba vinculado" (omitidos); sin duplicados | RN-MIG-006 | |
| A10 | Evento ZKTeco con número importado | Resuelve al socio correcto (mismas reglas que X15) | RN-MIG-006, RN-ACC-011 | |

---

## Identity (app)

| # | Caso | Esperado | RN/CU | R |
|---|------|----------|-------|---|
| I1 | App: email+password socio | Lista gyms o entra si hay uno; sin slug | — | |
| I2 | App: admin seed | Picker o entra como Staff en Gym de Prueba | RN-ROL-005 | |
| I3 | Cambiar gym | Vuelve al picker; wallet no se borra | — | |
| I4 | Cerrar sesión | Pide login; wallet lock | — | |
| I5 | Identity JWT en Caja | 403 select gym | RN-TEN-001 | |
| I6 | App: Continuar con Google (cuenta nueva) | Identity + picker vacío o gym si el mail ya es socio/staff | — | |
| I7 | App: Google con el mismo mail que el seed | Entra a Gym de Prueba; no duplica identity | — | |
| I8 | Apex `/login`: Continuar con Google (cuenta nueva) | Proxy + cookie; JWT Identity; va a `/cuenta` o `next` | — | |
| I9 | Apex `/login`: Google con mail ya registrado (password) | Vincula `googleSub`; misma identity; no duplica | — | |
| I10 | Apex logueado abre `/login` o Entrar | “Cargando sesión…” y va a `/cuenta`; no se ve el formulario | — | |
| I11 | Apex `/cuenta` | `AccountPanel` (logout + pass) + Mis tenants + Plan del seleccionado | — | |

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
| P3d | Staff genera link MP de carrito en Caja | Sin redirect; QR + copiar/abrir; al webhook APPROVED “Ver comprobante” (1 receipt por cart) y Staff = quien generó el link | CU-PAG-001 | |
| P3d2 | Cancelar y limpiar con link pendiente (web y app staff) | Confirma; saca link/carrito/afiliado de Caja. No anula MP: un pago posterior igual puede aprobar | CU-PAG-001 | |
| P3e | Staff cobra carrito en efectivo en Caja | APPROVED inmediato; panel con líneas (pack → contrato/vigencia + servicios del pack; drop-in → reserva/horario) | CU-PAG-002 | |
| P3f | Afiliado paga carrito MP desde la app (pack y/o drop-in) | `POST /me/transaction-items/mp/cart` → 1 Preference; mismos derechos al APPROVED que Caja; sin cash en el celular | CU-PAG-001 | |
| P3g | Caja `admin`: tilde 30 días, un pack, efectivo, gym sin prueba | Contrato TENANT 30 días $0; Plan / Uso en el gym muestra Prueba | RN-PAG-017 | |
| P3h | Misma cuenta o mismo gym: segundo tilde de prueba | Tilde deshabilitado / 400 | RN-PAG-017 | |
| P3i | Gym (no demo/admin) sin plan + 3 días | Banner + popup; nav solo Plan / Uso; Caja 403; Plan 200 | RN-PAG-018, CU-PAG-011 | |
| P3j | Apex: pack → cuenta → slug → MP autoriza (prueba) | Nace el gym; Plan prueba; staff entra en el slug | RN-PAG-017 | |
| P3k | Apex: iniciar alta, abandonar en MP y reintentar el mismo slug | El reintento sigue (el intento viejo queda «Reemplazado»); otro usuario recién puede usar el slug entre 1 y 2 h después | RN-PAG-017 | |
| P3l | Alta autorizada pero sin webhook | Al volver a `/cuenta` (o en ≤ 1 h) nace el gym | RN-PAG-017 | |
| P4 | Comprobante tras pago | Visible app + email E1; en reportes y cierres, “Ver comprobante” abre el panel (pack incluye servicios) | RN-PAG-009 | |
| P5 | Devolución afiliado dentro de política | Solicitud OK | CU-PAG-004 | |
| P6 | Devolución afiliado fuera de política | Rechazo; admin aún puede | RN-PAG-012/011 | |
| P7 | Admin devolución cart (parcial o todo) | Derechos de los ítems elegidos caen; un egreso + un comprobante REFUND; se puede devolver el resto después | CU-PAG-005 | |
| P8 | Arqueo con diferencia | Se registra diff; la grilla de Cierre es la misma que Reportes (categoría + tipo + staff + comprobante) | CU-PAG-003 | |
| P8b | Cierre con cobro MP + cobro efectivo | El efectivo esperado cuenta solo el cobro en efectivo | RN-PAG-007 | |
| P8c | Gasto en efectivo hoy | Baja el efectivo esperado del Cierre; un gasto por transferencia no lo cambia | RN-GAS-004, CU-PAG-012 | |
| P8d | Gasto con 5 comprobantes, intentar un sexto | Rechazo "hasta 5 comprobantes" | RN-GAS-005 | |
| P8e | Cerrar el día y editar/borrar un gasto en efectivo de ese día | 409; adjuntar comprobante sí funciona | RN-GAS-006 | |
| P8f | Borrar etiqueta con gastos | 409; archivar la saca del selector de gastos nuevos | RN-GAS-003 | |
| P8g | Reportes con gastos en el período | Panel "Gastos y resultado": fijos/variables, por etiqueta, resultado = ingresos − devoluciones − gastos | CU-PAG-012 | |

### Débito automático (suscripción MP — comprobar en live)

Pasos de VPS: [uso/probar-debito-suscripcion-mp.md](./uso/probar-debito-suscripcion-mp.md).

| # | Caso | Esperado | RN/CU | R |
|---|------|----------|-------|---|
| P9 | Tilde débito con carrito mixto o CASH | No hay tilde | RN-PAG-014 | |
| P9b | MP 1 MONTHLY + tilde | Link `init_point` de suscripción (no Brick); al pagar en MP: mandato activo + contrato del primer ciclo; auditoría | CU-PAG-008 | |
| P9c | Socio con MONTHLY efectivo: generar link | Autoriza; primer cobro en `endsAt` (`start_date`); sin cobro ahora | CU-PAG-008 | |
| P9d | MP cobra el ciclo | Contrato nuevo; no duplica si el mismo payment/ciclo ya se aplicó | CU-PAG-009 | |
| P9e | MP rechaza y deja fallido | Mandato fallido; tolerancia/deuda como hoy | RN-PAG-015 | |
| P9f | Baja débito | Cancela preapproval; contrato vigente sigue | CU-PAG-010 | |
| P9g | Devolver cobro que inscribió | Mandato a baja + cancel en MP | RN-PAG-016 | |
| P9h | Ficha → Caja débitos | `/caja?memberId=&vista=debitos`; no hay UI de mandato en la ficha | CU-AFI-004 | |
| P9i | Cambio de pack A→B | Cancela A; alta B para el próximo cobro; sin prorrateo | RN-PAG-016 | |
| P9j | Cambio de precio del pack | Las suscripciones activas siguen con su monto; Regenerar link o Próximo pack toma el precio nuevo | RN-PAG-013 | |
| P9k | Socio con otro mail en MP | Cargar el mail de su cuenta MP al tildar débito (o en Débitos + Regenerar link): MP deja autorizar; vacío = mail del afiliado; el mail queda en el mandato | RN-PAG-013 | |

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
| X14 | Config → Puerta = Acceso ZKTeco | `/puerta` sin QR: "Este gym usa acceso ZKTeco" + últimos ingresos; `POST /access/oid4vp/request` 409; emitir credencial socio/staff 409 | RN-ACC-010 | |
| X15 | Evento ZKTeco con DNI del socio (sin vínculo) | Misma decisión que con la app (p.ej. `sin_derecho` / `ok_acceso_libre`); historial canal "ZKTeco" | RN-ACC-011, CU-ACC-008 | |
| X16 | Evento ZKTeco con número vinculado a staff activo | ALLOWED `ok_staff`, `open=true`; log "Abrir puerta (simulado)" | RN-ACC-011 | |
| X17 | Evento ZKTeco con número desconocido | DENIED `sin_vinculo`; Quién = "Nº … (sin vincular)" | RN-ACC-011 | |
| X18 | Mismo evento ZKTeco dos veces | `duplicate=true`, `open=false`, una sola fila en historial | RN-ACC-011 | |
| X19 | Vincular número ya usado por otra persona | 409 | CU-ACC-009 | |
| X20 | Volver Config → Puerta = Kuatia | QR de `/puerta` vuelve; evento ZKTeco → 409 | RN-ACC-010 | |
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
| C5-1 | Staff, burbuja Asistente abajo a la derecha | Abre drawer; Caja sigue detrás | C5 | |
| C5-2 | Primer uso / sin hilos | Vacío + composer; enviar crea hilo y stremea | C5 | |
| C5-3 | Reabrir drawer | Último hilo + historial (tools en una línea) | C5 | |
| C5-4 | Archivar hilo | Sale de la lista; si era el activo, abre otro o vacío | C5 | |
| C5-5 | Disclaimer | “…puede equivocarse. No cambia nada sin que lo confirmes.” | C5 · RN-ASI-001 | |

---

## Asistente MCP lectura amplia (post-MVP — C6)

| # | Caso | Esperado | RN/CU | R |
|---|------|----------|-------|---|
| C6-1 | `npm run smoke` con JWT Admin seed | 19 tools; `get_reports_summary` sin args = mes BA; `get_help` packs; gastos OK Admin / sin permiso Entrenador | C6 | |
| C6-2 | Drawer: “ingresos de este mes” | Tool reportes + una línea; totales del mes | C6 | |
| C6-3 | Drawer: “qué packs hay” / “cómo enrolar débito” / “cómo conectar Mercado Pago” / “dónde cargo la rutina o un PDF del socio” | `list_packs` / `get_help` debito / `get_help` mercadopago / `get_help` carpeta | C6 | |
| C6-5 | Landing o Admin: “cómo se ve Caja / qué ve el socio en Inicio” | `get_help` topic `guia`; puede mandar a `/docs` para las fotos | C6 | |
| C6-4 | Staff sin caja: débitos o caja | Tool “No hay permiso para esta consulta.” | C6 | |

---

## Asistente C7 parcial (abort, título, errores LLM)

| # | Caso | Esperado | RN/CU | R |
|---|------|----------|-------|---|
| C7-1 | Nuevo chat + primer mensaje | Sidebar deja de decir “Sin título”; recorta el texto. Se puede editar y Enter/blur guarda | C7 | |
| C7-2 | Parar a mitad de stream | Enviar → Parar; queda lo generado (texto/tools). Se puede seguir el hilo | C7 | |
| C7-3 | OpenRouter sin crédito / clave mala | Banner claro (crédito o clave). No se pierde el mensaje del staff | C7 | |
| C7-4 | Chip de una tool (p. ej. Reportes) | Cierra el drawer y navega a `/reportes` | C7 | |
| C7-5 | `npm run smoke` en `mcp/` tras seed | Admin: dos períodos distintos; Entrenador: caja/débito sin permiso, reportes+help OK | C7 | |

---

## Asistente C8 — escritura con confirmación

| # | Caso | Esperado | RN/CU | R |
|---|------|----------|-------|---|
| C8-1 | “Cargá un gasto de 15000 de luz, variable, transferencia” | Tarjeta “Cargar gasto” con etiqueta, monto, medio, fecha. Sin tocar nada no hay gasto en `/gastos` | RN-ASI-001 | |
| C8-2 | Confirmar en la tarjeta | “Hecho” + texto; el gasto aparece en `/gastos` y en auditoría | RN-ASI-001 | |
| C8-3 | Cancelar, o esperar 2 min y Confirmar | “Cancelada” / “Venció”; no se hace nada | RN-ASI-001 | |
| C8-4 | Gasto con etiqueta que no existe | No hay tarjeta; el asistente lista las etiquetas existentes | RN-ASI-002 | |
| C8-5 | “Dá de alta a Ana Pérez, ana@…” y confirmar | Socio creado; entra a la app con `ChangeMe123!` y se le pide cambiarla | RN-ASI-003 | |
| C8-6 | “Suspendé a Ana” / “Creá un rol Recepción” | Tarjeta roja; Confirmar pide escribir CONFIRMAR | RN-ASI-004 | |
| C8-7 | “Subí el cupo de la clase de mañana a 20” | Tarjeta “Ampliar cupo”; al confirmar, la lista de espera se promueve | RN-ASI-002 | |
| C8-8 | Entrenador: “cargá un gasto” | No arma tarjeta: “No tenés permiso…” | RN-ASI-001 | |
| C8-9 | “Cobrale el pack a Ana” / “Devolvele” / “Abrí la puerta” / “Borrá el servicio” | No lo hace; explica que es por seguridad y da el link a la pantalla | RN-ASI-002 | |
| C8-10 | Reservar a un socio sin crédito y confirmar | “No se pudo: …” con el motivo de la API | RN-ASI-002 | |

---

## Carpeta

| # | Caso | Esperado | RN/CU | R |
|---|------|----------|-------|---|
| F1 | Staff abre carpeta: nota Markdown + PDF | Lista solo título/nombre y fecha; Abrir nota muestra visor; socio igual en app | CU-FOL-001 RN-FOL-005 | |
| F2 | Staff carpeta de otro staff | Con `staff.read` ve; carga con `staff.write` | CU-FOL-002 | |
| F3 | GET file sin JWT | 401 | RN-FOL-004 | |
| F4 | `POST /upload` no crea ítem de carpeta | Foto ficha sigue aparte | RN-FOL-004 | |
| F5 | 11.er ítem o file > 5 MB | 400; UI indica cupo 10 / 5 MB | RN-FOL-006 | |
| F6 | Quitar o cambiar foto de ficha/servicio/pack | `imageUrl` nuevo o null; el objeto R2 anterior ya no responde | | |

---

## Rutinas (backlog)

| # | Caso | Esperado | RN/CU | R |
|---|------|----------|-------|---|
| U1 | Asignar rutina | Diferido | CU-RUT-003 | |
| U2 | Editar plantilla | No cambia copia vieja | RN-RUT-005 | |
| U3 | Varias rutinas activas | Ambas visibles | RN-RUT-004 | |
| U4 | Registrar cumplimiento + tiempo | Persistido | CU-RUT-006 | |
| U5 | Sin mediciones | App usable igual | RN-RUT-007 | |

---

## Notificaciones

| # | Caso | Esperado | RN/CU | R |
|---|------|----------|-------|---|
| N1 | Pago aprobado (caja o MP) | Email (si MAIL_DRIVER=resend) + fila in-app | E1 | |
| N2 | Gym apaga evento (Admin Avisos o `active=false`) | No envía ni in-app | RN-NOT-003 | |
| N3 | Afiliado apaga email en Avisos | Siguiente pago: bandeja sí, mail no | CU-NOT-003 | |
| N4 | Editar plantilla en Admin `/avisos` | Siguiente envío usa texto nuevo | CU-NOT-002 | |
| N5 | Branding nombre gym | Visible en asunto/cuerpo | RN-NOT-004 | |
| N6 | Mismo pago webhook 2 veces | Un solo aviso (idempotencia) | | |
| N7 | Reserva confirmada / cancelada | Aviso in-app (y mail si ON) | E4 E5 | |
| N8 | Waitlist AUTO_ASSIGN | Aviso “hay un lugar” | E6 | |
| N9 | Staff ejecuta devolución | Aviso al socio | E9 | |
| N10 | Cron 12:00 ART, pack MONTHLY en ventana | Caja: aviso “por vencer”; débito: “próximo débito / saldo”; tolerancia: E3. Un aviso por contrato | E2 E3 | |
| N11 | Débito MP rejected | Mandato `RETRYING` + aviso in-app | débito socio | |
| N13 | Cron plan Faciliter por vencer | Mail al dueño (Identity); débito vs caja | TENANT | |
| N14 | Caja admin cobra pack a un gym | Aviso `PLATFORM_PLAN_PAID` al dueño | TENANT | |
| N15 | Débito Faciliter rejected / preapproval cancelled | Aviso cobro o mandato fallido al dueño | TENANT | |

---

## Vencimientos (cola recepción)

| # | Caso | Esperado | RN/CU | R |
|---|------|----------|-------|---|
| V1 | Staff Admin, `/vencimientos` | Lista MONTHLY por vencer (0–7 días) o en tolerancia; pills 7 días / tolerancia / débito / a mano; stats En cola | RN-CON-001, RN-ACC-005 | |
| V2 | Fila a mano + permiso caja | Caja abre `/caja?memberId=`; Débitos no aparece | CU-PAG-002 | |
| V3 | Fila débito o débito fallido | Caja y Débitos (`vista=debitos`) | CU-AFI-004 | |
| V4 | Entrenador (`members.read`, sin caja) | Ve la lista; no ve Caja/Débitos | RN-ROL-007 | |
| V5 | `GET /expirations` sin `members.read` | 403 | — | |

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

## Panel Admin (layout)

| # | Caso | Esperado | RN/CU | R |
|---|------|----------|-------|---|
| W1 | Viewport ~375px: Cierre, Reportes, Afiliados, Auditoría, Packs | La página no se estira; la tabla scrollea horizontal **dentro** del panel | — | |
| W2 | Mismo viewport: Sesiones calendario | Semana con scroll horizontal; columnas de día usables | CU-SER-003 | |
| W3 | Reportes/Cierre KPIs en ~375px | Stats en **una** columna | — | |

---

## Sitio público (landing / SEO)

| # | Caso | Esperado | RN/CU | R |
|---|------|----------|-------|---|
| M1 | Apex `http://localhost:3002/` | Landing Faciliter (no pide login) | P3 | |
| M2 | Tenant `http://demo.localhost:3002/` | Dashboard Admin (RequireStaff) | — | |
| M3 | View-source apex | `<title>` empieza con “Faciliter \|”, description, canonical, JSON-LD `Organization` + `SoftwareApplication` | P3 | |
| M3b | `/opengraph-image` y preview al compartir | PNG 1200×630: isotipo + FACILITER + tagline; `og:image:width` 1200 / `height` 630 | P3 | |
| M4 | `/sitemap.xml` y `/robots.txt` | URLs públicas; Admin en disallow | P3 | |
| M5 | `/legal/terminos` y `/legal/privacidad` | Borrador visible; no 404 | P3 | |
| M6 | Host tenant: header `X-Robots-Tag` | `noindex, nofollow` | P3 | |
| M7 | Apex burbuja `#asistente` | Abre el mismo drawer que el Admin; responde pack/caja/puerta; no pide login | P3 | |
| M8 | Widget no lista socios de un gym | Sin tools de operación; solo ayuda de producto | C7/landing | |

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
