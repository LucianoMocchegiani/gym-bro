# GymBro — Reglas de negocio

**Estado:** Cerrado (v1)  
**Dominio:** [03-modelo-dominio.md](./03-modelo-dominio.md)  
**Maestro:** [01-documento-maestro.md](./01-documento-maestro.md)

Cada regla tiene ID estable para referenciar desde casos de uso y pruebas manuales.

Formato: **RN-MODULO-NNN** — enunciado — excepciones.

---

## 1. Tenant y configuración (RN-TEN)

| ID | Regla |
|----|--------|
| RN-TEN-001 | Los datos de un tenant no son visibles ni modificables por otro tenant. |
| RN-TEN-002 | Solo el Super Administrador crea o suspende tenants. |
| RN-TEN-003 | El modelo incluye Sucursal; en MVP la operación visible es de una sede (S2). |
| RN-TEN-004 | La tolerancia de deuda por defecto es **15 días** y es configurable por gym. |
| RN-TEN-005 | Las horas mínimas para cancelar una reserva las define el gym. |
| RN-TEN-006 | El modo de lista de espera lo define el gym (ver RN-RES). |
| RN-TEN-007 | El multi-ingreso diario (sí/no y límites) lo define el gym. |
| RN-TEN-008 | El alcance de alumnos visibles para el rol Profesor lo define el admin; **default: ver todos** (lectura). |

---

## 2. Servicios, packs y sesiones (RN-SER)

| ID | Regla |
|----|--------|
| RN-SER-001 | Todo lo vendible se modela como **Servicio** (`ACCESO_LIBRE` o `POR_SESIONES`) y/o **Pack**. |
| RN-SER-002 | Un servicio de acceso libre no exige reserva de sesión para el ingreso general. |
| RN-SER-003 | Un servicio por sesiones se consume mediante **Sesiones** en calendario y **Reservas**. |
| RN-SER-004 | El admin puede componer **Packs** que combinan servicios (incl. packs mixtos). |
| RN-SER-005 | El acceso libre y los packs compuestos de tipo suscripción se cobran en modalidad **mensual** (u otra periodicidad de suscripción definida en el pack). |
| RN-SER-006 | Para actividad por sesiones, el gym habilita drop-in y/o packs de créditos por servicio/pack. |
| RN-SER-007 | El vencimiento de créditos: en packs **MONTHLY** coincide con el `endsAt` del contrato (mismo periodo que el libre). En packs **ONE_TIME** es configurable por pack (`creditsExpireAt`; default +1 mes desde el alta). Quién edita catálogo: admin; profesor si tiene permiso. |
| RN-SER-008 | Si el afiliado se queda sin créditos, puede comprar otro pack (si el gym lo ofrece) y/o drop-in. |
| RN-SER-009 | Al cancelar o reembolsar un **pack compuesto**, el afiliado pierde **todos** los componentes del pack. |
| RN-SER-010 | Toda sesión tiene cupo; staff con permiso puede **ampliar** el cupo. |
| RN-SER-011 | Una sesión puede publicarse sin profesor; se recomienda profesor para métricas. |
| RN-SER-012 | Las reglas de recurrencia generan sesiones futuras según patrón simple (MVP). |
| RN-SER-013 | El profesor de una sesión, si está asignado, queda registrado para reporting. |

---

## 2b. Contrataciones (RN-CON)

| ID | Regla |
|----|--------|
| RN-CON-001 | Pack **MONTHLY**: un afiliado tiene **un solo plan mensual** vigente a la vez. Renovar el **mismo** pack apila vigencia (nuevo `startsAt` = `endsAt` del tramo ACTIVE vigente; no se pisan). Otro pack MONTHLY distinto mientras haya uno vigente → rechazado; extras vía pack **ONE_TIME**. |
| RN-CON-002 | Pack **MONTHLY**: libre y créditos del contrato comparten el mismo periodo (`startsAt` → `endsAt` = +1 mes). No se customiza duración por componente. |
| RN-CON-003 | Pack **ONE_TIME**: puede solapar con el plan mensual y con otros únicos. Default `endsAt` = `startsAt` + 1 mes; si el pack define `creditsExpireAt` futuro, se usa esa fecha. Créditos heredan ese `endsAt`. |
| RN-CON-004 | Al contratar, staff puede enviar fechas opcionales: **MONTHLY** solo `startsAt` (`endsAt` = +1 mes; 400 si solapa otro ACTIVE del mismo pack). **ONE_TIME** `startsAt` y/o `endsAt` (pueden solapar; `endsAt` > `startsAt`). Sin fechas → RN-CON-001–003. |

---

## 3. Reservas y lista de espera (RN-RES)

| ID | Regla |
|----|--------|
| RN-RES-001 | **Reservar implica pagar**: no hay reserva confirmada sin pago **aprobado** (MP o caja), salvo reglas explícitas futuras. |
| RN-RES-002 | Staff con permiso puede crear una reserva **en nombre** del afiliado (el pago sigue RN-RES-001). |
| RN-RES-003 | El afiliado solo puede cancelar una reserva si está dentro de la ventana de horas del gym (RN-TEN-005). |
| RN-RES-004 | Si la sesión está llena, el afiliado puede anotarse en **lista de espera**. |
| RN-RES-005 | Modos de lista de espera (config gym): (1) auto-asignar cupo liberado; (2) afiliado debe confirmar en plazo; (3) confirma admin/profesor. |
| RN-RES-006 | Si el gym permite ingreso tardío: con cupo disponible (o ampliado) y la sesión ya iniciada, el afiliado puede pagar/consumir crédito e ingresar según política del gym. |
| RN-RES-007 | La asistencia (presente) a una sesión se marca al **verificar ingreso QR** que el sistema asocie a esa sesión. |

---

## 4. Pagos y caja (RN-PAG)

| ID | Regla |
|----|--------|
| RN-PAG-001 | Mercado Pago utiliza la **cuenta del gym** (tenant). |
| RN-PAG-002 | En MVP se pueden pagar: mensualidades, packs y drop-in. |
| RN-PAG-003 | Estados de pago: `pendiente`, `aprobado`, `rechazado`, `reembolsado`. |
| RN-PAG-004 | Una contratación o reserva solo se confirma cuando el pago queda `aprobado`. |
| RN-PAG-005 | Todo cobro de negocio debe usar **idempotencia** para evitar doble pago. |
| RN-PAG-006 | Si pese a RN-PAG-005 ocurre un cobro duplicado, el admin gestiona el **reembolso**. |
| RN-PAG-007 | La caja registra movimientos del día y permite **arqueo** en MVP. |
| RN-PAG-008 | Operar caja requiere permiso de rol (no necesariamente solo el rol “Admin”). |
| RN-PAG-009 | Todo pago aprobado genera **comprobante interno** visible en app y disparador N1. |
| RN-PAG-010 | AFIP / factura electrónica está fuera de MVP. |
| RN-PAG-011 | El admin (con flag) puede devolver **siempre**. |
| RN-PAG-012 | El afiliado puede solicitar devolución por la app según política del gym. **Defaults sugeridos:** libre → dentro de 1 día; pack solo sesiones → si no consumió créditos; pack mixto → deben cumplirse ambas condiciones a la vez. Configurables por gym. |

---

## 5. Acceso e ingresos (RN-ACC)

| ID | Regla |
|----|--------|
| RN-ACC-001 | El proveedor de identidad de acceso es intercambiable (adapter); MVP = SSI/Quark. |
| RN-ACC-002 | La credencial SSI de MVP es de **vínculo** afiliado↔gym; los derechos (packs, deuda, sesión) los evalúa GymBro. |
| RN-ACC-003 | El diseño contempla escaneo gym→afiliado y afiliado→QR del local; el MVP implementa al menos uno. |
| RN-ACC-004 | Para acceso libre se validan contrataciones vigentes que otorguen ese derecho y la política de deuda/tolerancia. |
| RN-ACC-005 | Con atraso ≤ tolerancia → ingreso permitido (si el resto de reglas OK). Con atraso > tolerancia → denegado, salvo pase manual. |
| RN-ACC-006 | Staff con permiso puede otorgar **pase manual** (queda auditado). |
| RN-ACC-007 | Todo intento (ok/deny) se registra con **motivo**. |
| RN-ACC-008 | Offline en puerta es post-MVP; MVP asume conectividad. |
| RN-ACC-009 | Multi-ingreso según RN-TEN-007. |

---

## 6. Rutinas (RN-RUT)

| ID | Regla |
|----|--------|
| RN-RUT-001 | Crear/editar/asignar rutinas requiere permiso; default: admin y profesor. |
| RN-RUT-002 | El catálogo de ejercicios es **por gym** en MVP. |
| RN-RUT-003 | Una rutina se organiza en N días (2, 3, 5, …). |
| RN-RUT-004 | Un afiliado puede tener **varias** rutinas asignadas activas. |
| RN-RUT-005 | Al asignar se crea una **copia**; editar la plantilla no modifica asignaciones previas. |
| RN-RUT-006 | El afiliado puede registrar cumplimiento, descansos y tiempo de ejecución. |
| RN-RUT-007 | Mediciones y fotos de progreso existen en MVP pero su uso es **opcional**. |
| RN-RUT-008 | Las rutinas son **independientes** de las sesiones. |

---

## 7. Notificaciones (RN-NOT)

| ID | Regla |
|----|--------|
| RN-NOT-001 | Canal N1 MVP: **email**; además siempre hay registro **in-app**. |
| RN-NOT-002 | Eventos MVP: E1 pago aprobado; E2 por vencer; E3 vencida/tolerancia; E4 reserva confirmada; E5 reserva cancelada; E6 lista de espera (cupo); E7 rutina asignada; E8 denegado/deuda; E9 devolución. |
| RN-NOT-003 | El gym puede activar/desactivar eventos uno a uno. |
| RN-NOT-004 | El branding/remitente visible usa el **nombre del gym**. |
| RN-NOT-005 | El afiliado puede desactivar las notificaciones que quiera (preferencia de no perder al usuario). |
| RN-NOT-006 | El admin recibe notificaciones relevantes de operación (pagos, fallos MP, etc.). |
| RN-NOT-007 | Las plantillas de mensaje son **editables** por el gym. |

---

## 8. Roles, permisos y auditoría (RN-ROL)

| ID | Regla |
|----|--------|
| RN-ROL-001 | Super Admin es exclusivo del equipo GymBro. |
| RN-ROL-002 | Al crear un gym se generan roles seed (incl. profesor y afiliado como defaults de producto); el gym puede crear y editar roles. |
| RN-ROL-003 | Los permisos tienen scope de **tenant**. |
| RN-ROL-004 | Un usuario staff puede tener **múltiples roles**. |
| RN-ROL-005 | Afiliado y staff son **perfiles distintos**. |
| RN-ROL-006 | Alta de staff: Super Admin, Admin del gym, u otro rol con el permiso correspondiente. |
| RN-ROL-007 | Acciones peligrosas (devoluciones, borrados sensibles, exports) requieren **flag explícito**. |
| RN-ROL-008 | Pase manual, devoluciones y cambios críticos generan **EventoAuditoria**. |
| RN-ROL-009 | Matriz default de referencia (ajustable por rol custom): config/MP/plantillas → Admin; afiliados CRUD → Admin y roles con permiso (ej. recepción); caja → Admin/permiso; rutinas → Admin+Profe; afiliado → self-service. |

---

## 9. Trazabilidad a documentación

| Documento | Uso de estas reglas |
|-----------|---------------------|
| Casos de uso | Campo “Reglas relacionadas” → IDs RN-* |
| Pruebas manuales | Un caso de prueba cita RN-* esperada |
| Backlog post-MVP | Excepciones futuras no contradicen RN sin versionar |

---

## 10. Versionado

- Cambiar una RN exige actualizar este archivo y los CU/pruebas que la citan.
- No reutilizar IDs con otro significado; deprecar con nota si hace falta.

---

[Índice](./00-indice.md) · [Siguiente: Casos de uso →](./05-casos-de-uso/README.md)
