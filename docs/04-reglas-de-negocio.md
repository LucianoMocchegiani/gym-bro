# Faciliter — Reglas de negocio

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
| RN-TEN-008 | El alcance de alumnos visibles para el rol Entrenador lo define el admin; **default: ver todos** (lectura). |

---

## 2. Servicios, packs y sesiones (RN-SER)

| ID | Regla |
|----|--------|
| RN-SER-001 | Todo lo vendible se modela como **Servicio** (`ACCESO_LIBRE` o `POR_SESIONES`) y/o **Pack**. |
| RN-SER-002 | Un servicio de acceso libre no exige reserva de sesión para el ingreso general. |
| RN-SER-003 | Un servicio por sesiones se consume mediante **Sesiones** en calendario y **Reservas**. |
| RN-SER-004 | El admin puede componer **Packs** que combinan servicios (incl. packs mixtos). |
| RN-SER-005 | El acceso libre y los packs compuestos de tipo suscripción se cobran en modalidad **mensual** (u otra periodicidad de suscripción definida en el pack). |
| RN-SER-006 | Para actividad por sesiones, el gym habilita drop-in y/o packs de créditos por servicio/pack. El drop-in es un pack **ONE_TIME** de 1 crédito del servicio (precio = `dropInPrice`); emite la misma VC de pack (una por afiliado+pack). |
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
| RN-CON-001 | Pack **MONTHLY**: un afiliado tiene **un solo plan mensual** vigente a la vez. Renovar el **mismo** pack: si el tramo previo aún no venció, o venció pero el afiliado **ingresó** en tolerancia, el nuevo `startsAt` es el **día calendario siguiente** al `endsAt` anterior; si venció **sin** ingresos en el hueco, `startsAt` = día de pago. Otro pack MONTHLY distinto mientras haya uno vigente → rechazado; extras vía pack **ONE_TIME**. |
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
| RN-PAG-001 | Mercado Pago utiliza la **cuenta del gym** (tenant). El gym la conecta autorizando a la app de plataforma Faciliter (OAuth); la plata va directo a su cuenta. El token pegado a mano es un respaldo avanzado. |
| RN-PAG-002 | En MVP se pueden pagar: mensualidades, packs y drop-in. Medios nuevos: Caja (efectivo) o Mercado Pago. `STUB` es legado: no se crean cobros. |
| RN-PAG-003 | Estados de pago: `pendiente`, `aprobado`, `rechazado`, `reembolsado`. |
| RN-PAG-004 | Una contratación o reserva solo se confirma cuando el pago queda `aprobado`. |
| RN-PAG-005 | Todo cobro de negocio debe usar **idempotencia** para evitar doble pago. |
| RN-PAG-006 | Si pese a RN-PAG-005 ocurre un cobro duplicado, el admin gestiona el **reembolso**. |
| RN-PAG-007 | La caja registra movimientos del día y permite **arqueo** en MVP. El arqueo cuenta solo **efectivo**: esperado = cobros CASH − devoluciones CASH − gastos CASH del día (RN-GAS-004). El Cierre muestra además el **digital esperado** (lo mismo con MP, transferencia y tarjeta) y el neto del día; es informativo y no entra al arqueo. |
| RN-PAG-008 | Operar caja requiere permiso de rol (no necesariamente solo el rol “Admin”). |
| RN-PAG-009 | Todo pago aprobado genera **comprobante interno** visible en app y disparador N1. |
| RN-PAG-010 | AFIP / factura electrónica está fuera de MVP. |
| RN-PAG-011 | El admin (con flag) puede devolver **siempre**. |
| RN-PAG-012 | El afiliado puede solicitar devolución por la app según política del gym. **Defaults sugeridos:** libre → dentro de 1 día; pack solo sesiones → si no consumió créditos; pack mixto → deben cumplirse ambas condiciones a la vez. Configurables por gym. |
| RN-PAG-013 | **Débito automático** (post-MVP, diseño 2026-09-15): solo packs `MONTHLY`. Un mandato = afiliado + pack a debitar + **suscripción Mercado Pago** (`preapproval`) en la **cuenta MP del gym**. La suscripción se crea **sin plan asociado** (`pending`, con link): con plan, MP exige tarjeta tokenizada. MP solo deja autorizar el link a la cuenta logueada con el `payer_email`: Caja pide el **mail de la cuenta MP del socio** (vacío = el mail del afiliado), se guarda en el mandato y lo reusan Regenerar link y Próximo pack; el alta self-serve (`/empezar`) pide el de la cuenta MP del dueño (por defecto, el de la cuenta Faciliter). Cada suscripción guarda el precio de catálogo de su alta; un precio nuevo aplica al regenerar el link o con Próximo pack. No hay débito de drop-in ni `ONE_TIME`. GymBro **no** guarda PAN ni dispara el Payment recurrente (no Customer+Card+job). UI solo en Caja; la ficha redirige a `/caja?memberId=&vista=debitos`. Fuera: Stripe, CBU/DEBIN, alta desde la app. |
| RN-PAG-014 | **Alta:** consentimiento en Caja + link de checkout MP (`init_point`); el socio completa en Mercado Pago. (1) Carrito = **un** MONTHLY + medio MP + tilde: se genera la suscripción (primer cobro = primer ciclo). (2) Pestaña Débitos, MONTHLY vigente (p. ej. pagó en efectivo): mismo link con `start_date` = `endsAt` del contrato (autoriza, cobra después). Efectivo no muestra el tilde. Auditoría: quién, cuándo, pack. |
| RN-PAG-015 | **Cobro:** lo hace MP según el plan. Cada cobro **approved** (webhook `subscription_authorized_payment` / `payment`) → Transaction PACK + contrato (RN-CON-001, RN-PAG-004/005). El contrato **sigue al cobro de MP** (no a un job en `endsAt`). Monto = el del plan (= catálogo al last update). Reintentos: política de MP; Caja muestra estado (activo / pendiente de checkout / fallido / baja), sin “Cobrar ahora”. Un cobro aprobado por ciclo; no duplicar contrato (RN-PAG-005). Tras fallos que MP deje en fallido: deuda/tolerancia (RN-ACC-005). |
| RN-PAG-016 | **Baja** en Caja cancela el `preapproval` en MP; el contrato vigente sigue hasta `endsAt`. Devolver el cobro que inscribió el mandato → baja automática de la suscripción. Cambio de pack A→B: cancelar A y alta B para el **próximo** cobro (sin prorrateo; no dos MONTHLY a la vez). |
| RN-PAG-017 | **Prueba Faciliter (30 días):** packs de plataforma que la ofrecen (`offers_platform_trial`, default sí; el pack de 100 de prueba no la ofrece y se cobra desde el primer mes), **una vez por Identity** y **una vez por tenant**. Caja `admin` (efectivo, tilde) o self-serve (preapproval MP de `admin`; con prueba nace el gym al autorizar, sin prueba con el primer cobro aprobado; si no se autoriza en 1 h el intento vence (job horario), libera el subdominio y se cancela en MP). Otorgar la prueba crea `Contract` TENANT `$0` a 30 días y marca ambos candados. Un cobro pago (sin tilde / segundo gym) agota solo el cupo del **gym**. |
| RN-PAG-018 | **Modo limitado (plan Faciliter):** grace **3 días** sin `TENANT` vigente (desde `endsAt` o, si nunca hubo plan, desde el alta del tenant). Después el staff entra pero no opera (API 403 salvo Plan / permisos). Allowlist por id: demo `…0001` y `admin` `…0002`. Impersonación plataforma no se recorta. Afiliado (MEMBER) no se recorta. |

---

## 4b. Gastos (RN-GAS)

| ID | Regla |
|----|--------|
| RN-GAS-001 | Un **gasto** es plata que paga el gym (alquiler, luz, mercadería…). No es cobro ni devolución: no crea `cash_movements`, ni comprobante, ni afecta contratos. Ver `expenses.read`; cargar, editar y borrar `expenses.write`. |
| RN-GAS-002 | Cada gasto lleva fecha de negocio (no futura), monto en pesos enteros, **naturaleza** `FIXED` o `VARIABLE`, **medio** (efectivo, transferencia, Mercado Pago, tarjeta), **etiqueta** obligatoria y nota opcional. Compra de mercadería es una etiqueta más. Sin gastos recurrentes automáticos en v1. |
| RN-GAS-003 | Las **etiquetas** las define cada gym (nombre único por tenant) y se pueden crear al cargar el gasto. Una etiqueta con gastos no se borra: se **archiva** y deja de ofrecerse para gastos nuevos. |
| RN-GAS-004 | Solo los gastos en **efectivo** restan en el arqueo del día (RN-PAG-007). Transferencia, MP y tarjeta se registran pero no tocan el cajón. |
| RN-GAS-005 | Hasta **5 comprobantes** por gasto (PDF o imagen, ≤ 5 MB c/u), en R2 privado; se bajan con JWT. |
| RN-GAS-006 | Si el día tiene **arqueo cerrado**, sus gastos en efectivo no se editan ni se borran, y no se pueden mover a ni desde ese día. Los comprobantes sí se pueden agregar o quitar. |

---

## 5. Acceso e ingresos (RN-ACC)

| ID | Regla |
|----|--------|
| RN-ACC-001 | El proveedor de identidad de acceso es intercambiable (adapter); MVP = SSI/Quark. |
| RN-ACC-002 | La credencial SSI de MVP es la VC de **pack** (OID4VCI). Los derechos (deuda, sesión, vigencia) los evalúa GymBro en puerta. Re-emitir no cobra: usa el contrato ACTIVE que cubre hoy (CU-AFI-006). |
| RN-ACC-003 | El diseño contempla escaneo gym→afiliado y afiliado→QR del local; el MVP implementa al menos uno. |
| RN-ACC-004 | Para acceso libre se validan contrataciones vigentes que otorguen ese derecho y la política de deuda/tolerancia. |
| RN-ACC-005 | Atraso = días calendario desde el `endsAt` del último contrato libre ACTIVE. Con atraso ≤ tolerancia → ingreso permitido (`ok_deuda_tolerancia` si el pack ya venció; RN-ACC-004). Con atraso > tolerancia → denegado (`deuda_excedida`), salvo pase manual. La tolerancia no define el `startsAt` de renovación (ver RN-CON-001). |
| RN-ACC-006 | Staff con permiso puede otorgar **pase manual** (queda auditado). |
| RN-ACC-007 | Todo intento (ok/deny) se registra con **motivo**. |
| RN-ACC-008 | Offline en puerta es post-MVP; MVP asume conectividad. |
| RN-ACC-009 | Multi-ingreso según RN-TEN-007. |
| RN-ACC-010 | **Sistema de puerta por gym:** `tenant_settings.access_provider` = `KUATIA` (default: QR de `/puerta` + credencial en la app) o `ZKTECO` (control de acceso ZKTeco: molinete, puerta u otro aparato donde la persona se identifica). Uno solo por gym en este corte; el diseño admite varios (gym pass necesitará Kuatia en todos). Las reglas de ingreso (RN-ACC-004/005/009, reserva, staff) son **las mismas** para cualquier sistema; cada intento guarda su `channel` (`kuatia` / `zkteco` / `manual`). En un gym ZKTeco no se emiten credenciales Kuatia (cobro de pack, re-emisión manual socio/staff → 409) y el QR OID4VP de `/puerta` responde 409. Pase manual funciona igual en ambos. |
| RN-ACC-011 | **Identidad ZKTeco:** el número de usuario del aparato (PIN o tarjeta) se resuelve primero por **vínculo** (`access_identity_links`: gym + proveedor + número → socio **o** staff, único por gym) y, si no hay, por `members.document` (DNI). El staff necesita vínculo. Número sin resolver → denegado `sin_vinculo`. Cada evento es idempotente por serie + número + hora del aparato: repetirlo devuelve el mismo resultado sin abrir de nuevo. Tras un permitido se pide abrir la puerta (en este corte, adaptador que solo registra). |

---

## 6b. Carpeta de documentos (RN-FOL)

| ID | Regla |
|----|--------|
| RN-FOL-001 | Cada socio y cada staff tiene una carpeta de **notas** y **archivos** (PDF o imagen) en su tenant. |
| RN-FOL-002 | Solo staff con `members.write` / `staff.write` carga o borra (Admin web). El dueño y staff con `*.read` ven. |
| RN-FOL-003 | Las **etiquetas** las define el gym (lista por tenant); Faciliter no impone categorías. |
| RN-FOL-004 | Los files de carpeta **no** se sirven por URL pública de R2; se bajan con JWT. Las fotos de ficha siguen en `POST /upload`. |
| RN-FOL-005 | El cuerpo de la nota se guarda como **Markdown** y se muestra en un visor (Admin y app). El HTML crudo no se ejecuta. |
| RN-FOL-006 | Por carpeta (socio o staff): máx. **10 ítems** (nota + PDF + imagen). File máx. **5 MB**. Nota: título 200, cuerpo 20.000 caracteres. |

---

## 6c. Migración de afiliados (RN-MIG)

| ID | Regla |
|----|--------|
| RN-MIG-001 | La migración desde otro sistema trae solo al **afiliado**: ficha, foto de perfil y carpeta. Packs, contratos, caja, débito y QR se arman en Faciliter. Requiere `members.import` (peligroso) + `members.write`. |
| RN-MIG-002 | El **mail** es obligatorio: una fila sin mail válido se omite y sale en el listado de errores. Nombre obligatorio. |
| RN-MIG-003 | Persona sin cuenta Faciliter → se crea con la contraseña **`ChangeMe123!`** marcada como temporal. Si ya tenía cuenta (otro gym), se vincula **sin tocar** su contraseña. La temporal deja de valer al cambiarla o al entrar con Google/Apple (se borra). Sin contraseña → "Crear contraseña" desde la app o la web. |
| RN-MIG-004 | Si ya es socio del gym (mismo mail, DNI o cuenta) se **omite**: re-subir el mismo archivo no duplica. El DNI se compara sin puntos ni guiones. |
| RN-MIG-005 | Fotos y carpeta (carpeta elegida en la PC o zip, misma estructura `fotos/` y `carpeta/{dni o mail}/`): si el socio ya tiene foto o algún ítem en la carpeta, no se le carga nada (se informa como omitido: “ya tiene archivos cargados”); re-subir no duplica. Si no tiene nada: una foto de perfil y documentos a carpeta respetando RN-FOL-006. No se mandan mails ni avisos, ni se emite credencial. Una sola auditoría por corrida (`member.import`) con totales. |
| RN-MIG-006 | **Números del aparato ZKTeco** (solo gyms con acceso ZKTeco, RN-ACC-010): planilla con el número que el socio ya tiene en el aparato + su DNI o mail. Se busca primero por DNI (sin puntos, guiones ni espacios) y si no, por mail; el socio tiene que estar importado antes. Número válido: letras, números, `-` o `_`, hasta 32. Un socio puede tener varios números. Mismo número ya vinculado a ese socio → omitido ("Ya estaba vinculado"); vinculado a otra persona (socio o staff), socio no encontrado, número inválido o repetido en la planilla → error. Primero se revisa sin escribir (descargable en CSV). Solo afiliados (el staff se vincula desde su ficha). Corrida tipo `ACCESS_CODES` en el historial, con una auditoría `member.import` con totales. |

---

## 6. Rutinas (RN-RUT)

**Fuera del MVP activo:** plantillas/cumplimiento están en [99-backlog-post-mvp/rutinas.md](./99-backlog-post-mvp/rutinas.md). La operación de “dejar una rutina” es un PDF o nota en la carpeta (RN-FOL).

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
| RN-NOT-002 | Eventos socio: E1 pago; E2 por vencer (caja vs débito); E3 tolerancia; E4–E6 reserva/waitlist; E9 devolución; débito MP rechazado / mandato fallido. Plan Faciliter (`TENANT`): cobro, por vencer caja/débito, gracia 3 días, cobro/mandato débito fallido. Sin puerta ni rutina. |
| RN-NOT-003 | El gym puede activar/desactivar eventos uno a uno. |
| RN-NOT-004 | El branding/remitente visible usa el **nombre del gym**. |
| RN-NOT-005 | El afiliado puede desactivar las notificaciones que quiera (preferencia de no perder al usuario). |
| RN-NOT-006 | El admin recibe notificaciones relevantes de operación (pagos, fallos MP, etc.). |
| RN-NOT-007 | Las plantillas de mensaje son **editables** por el gym. |

---

## 8. Roles, permisos y auditoría (RN-ROL)

| ID | Regla |
|----|--------|
| RN-ROL-001 | El rol **Super Admin** (`super-admin`) vive en el tenant plataforma (`admin`). Es exclusivo del equipo Faciliter. No hay perfil JWT `SUPER` ni `POST /auth/super/login`. |
| RN-ROL-002 | Al crear un gym se generan roles seed (Admin, Entrenador; slug `entrenador`). El gym puede crear, editar y **eliminar** roles; el **Admin** de sistema no se edita ni se elimina. En el tenant plataforma, **Super Admin** (`super-admin`) igual: no se edita ni se elimina. Entrenador es seed (permisos default) y sí se puede editar o borrar. |
| RN-ROL-003 | Los permisos tienen scope de **tenant**. |
| RN-ROL-004 | Un usuario staff puede tener **múltiples roles**. |
| RN-ROL-005 | Afiliado y staff son **perfiles distintos**. |
| RN-ROL-006 | Alta de staff: Super Admin, Admin del gym, u otro rol con el permiso correspondiente. |
| RN-ROL-007 | Acciones peligrosas (devoluciones, borrados sensibles, exports) requieren **flag explícito**. |
| RN-ROL-008 | Pase manual, devoluciones y cambios críticos generan **EventoAuditoria**. |
| RN-ROL-009 | Matriz default de referencia (ajustable por rol custom): config/MP/plantillas → Admin; afiliados CRUD → Admin y roles con permiso (ej. recepción); caja → Admin/permiso; rutinas → Admin+Entrenador; afiliado → self-service. |

---

## 8b. Cuenta Faciliter (RN-CTA)

| ID | Regla |
|----|--------|
| RN-CTA-001 | La persona puede **eliminar su cuenta Faciliter** desde la app (Ajustes) y desde la web (`/cuenta`), escribiendo **ELIMINAR**. La baja es **inmediata** y no se puede deshacer. Requisito de App Store (5.1.1(v)) y Google Play. No se permite desde una impersonación. |
| RN-CTA-002 | Al eliminar: se cancelan sus **débitos automáticos** y **reservas futuras** en todos los gyms y sale de las listas de espera; lo que quede de packs vigentes se pierde. Sus usuarios staff quedan **inactivos**. Se revocan todas las sesiones y se borran sus avisos y preferencias. |
| RN-CTA-003 | Si es **dueña de un gym activo**, no puede eliminar la cuenta: primero da de baja o transfiere el gym (409). |
| RN-CTA-004 | La cuenta se **anonimiza**, no se borra: mail inválido, sin nombre, contraseña ni Google/Apple. Cada gym **conserva** la ficha del socio/staff y su historial (pagos, comprobantes): es su registro comercial; si la persona quiere que el gym también la borre, se lo pide al gym. El mismo mail o Google después crea una **cuenta nueva y vacía** (no hereda gyms). Se audita `identity.delete` y se manda un mail de confirmación. |
| RN-CTA-005 | **Web del gym** (`{slug}.{dominio}`): `/` es la vidriera pública (nombre y packs, indexable); el panel staff vive en `/dashboard/...` y las rutas viejas (`/caja`, `/puerta`…) redirigen con 308. El host `admin` no tiene vidriera: su raíz redirige al apex. |
| RN-CTA-006 | **Login único** en `{slug}/login` con la cuenta Faciliter (mail y contraseña o Google): con perfil staff entra al panel, con perfil socio a su **portal** (`/portal`); si tiene los dos, elige (igual que la app). El avatar del header lleva a **Mi cuenta** (`/cuenta`: datos, contraseña y cerrar sesión). Cerrar sesión cierra las tres sesiones del navegador en ese gym (staff, socio y cuenta). La impersonación de plataforma no cambia. |
| RN-CTA-007 | **Alta self-service del socio, con pago previo:** una cuenta Faciliter que no es socia del gym puede hacerse socia desde la web comprando un pack: nombre, DNI (obligatorio) y teléfono opcional; el mail es el de la cuenta. Antes de cobrar se valida: gym activo, que no sea socia y DNI/mail libres en el gym (409); socia suspendida o dada de baja → 403. Se guarda una **solicitud de alta** (`member_signups`) y el socio nace **recién con el pago aprobado** (webhook): **ACTIVE** sin pasar por staff, auditado `member.self_join`, con el pack activado y su comprobante. Si no paga, no se crea nada en Afiliados. Si al aprobarse el DNI ya fue tomado por otro socio, la solicitud queda con error, el pago sigue aprobado y lo resuelve el gym a mano. Quien ya es socia activa solo paga el pack. No aplica al tenant `admin`. |
| RN-CTA-008 | **Venta online en la web del gym:** el botón Comprar aparece solo si el gym tiene Mercado Pago conectado; si no, el pack figura como «se contrata en el gym». Se venden los mismos packs que en la tienda de la app (activos, precio ≥ 1, con componentes). Al terminar, Mercado Pago vuelve a `/portal?compra=…`; el pack se activa con el webhook aprobado (RN-PAG). Si quien compra ya es socia, el pack va a su carrito del portal (RN-CTA-009). |
| RN-CTA-009 | **Portal web del socio** (`{slug}/portal/*`): mismo alcance de sesiones y compras que la app, con los mismos endpoints `/me/*` y reglas. Calendario: con créditos del servicio reserva; sin créditos, si la sesión tiene drop-in, la clase va al carrito; si no, se ofrece comprar un plan. **Carrito**: packs y drop-ins, una línea por ítem sin repetir, un solo pago en Mercado Pago (solo con MP conectado); vive en el navegador y se vacía al pagar o al cerrar sesión (en `/cuenta`). Además: «Mis clases» (cancelar / salir de la espera con confirmación) e **Historial** con todos los comprobantes y pedido de devolución por línea, **Documentos** (carpeta en solo lectura, CU-FOL-003) y **Avisos** (bandeja con contador de no leídos en el menú y correo por tipo de aviso, CU-NOT-003/005). Datos, contraseña y cerrar sesión: `/cuenta`. |

---

## 8c. Asistente del Admin (RN-ASI)

| ID | Regla |
|----|--------|
| RN-ASI-001 | El asistente **nunca cambia nada solo**: arma una **propuesta** (tarjeta con el detalle) y recién se ejecuta cuando el staff toca **Confirmar**. La propuesta vence a los **2 minutos**, sirve **una sola vez** y solo la puede confirmar el mismo staff que la pidió. Se ejecuta con sus permisos (sin permiso → no se arma) y queda en auditoría igual que desde la pantalla. |
| RN-ASI-002 | Puede proponer **crear y editar**: gastos, afiliados (alta, ficha, estado), servicios, packs, clases puntuales, series semanales (solo alta), reservas con crédito y lista de espera, staff (alta, datos, roles) y roles. **No** hace, por seguridad: cobros / Caja / links de pago, clase suelta (drop-in), devoluciones, débito automático, pase manual de puerta, configuración / Mercado Pago, borrar o cancelar, subir archivos. Si se lo piden, lo explica y lleva a la pantalla. |
| RN-ASI-003 | Alta de afiliado o staff desde el asistente (y desde la API sin contraseña): persona sin cuenta Faciliter → `ChangeMe123!` **temporal** (igual que RN-MIG-003). Si ya tenía cuenta, conserva la suya. |
| RN-ASI-004 | Acciones peligrosas (estado del afiliado, staff con roles, asignar roles, crear o editar roles) piden además escribir **CONFIRMAR** (RN-ROL-007). El chat público de la landing nunca escribe. |

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
