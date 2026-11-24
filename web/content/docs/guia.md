# Guía de uso — Faciliter

**Estado:** publicada en `/docs`. Este archivo es el texto canónico; el sitio lo divide en capítulos y la ayuda del asistente debe mantener los mismos recorridos. Las líneas **Captura** se usan para ubicar imágenes y no se muestran cuando la imagen no existe.

**Para quién:** dueño y staff del local. La guía cubre el panel de administración, el portal del afiliado y la web pública del tenant.

**Capturas:** archivos PNG reales en `web/public/docs/`, sin información personal ni credenciales. Mercado Pago debe mostrarse con datos de prueba y tokens enmascarados.

---

## Mapa

- Qué es Faciliter: `/docs/que-es`
- Primeros pasos: `/docs/primeros-pasos`
- Panel de administración: `/docs/modulos`
- Portal de afiliados y usuarios: [`/docs/portal-afiliados`](/docs/portal-afiliados)
- Tu cuenta y el plan: `/docs/cuenta`
- Configuración detallada: [`/docs/config`](/docs/config)
- Web pública del tenant: [`/docs/web-tenant`](/docs/web-tenant)

---

# Parte 1 — Qué es y cómo funciona

## 01. Qué es Faciliter

Faciliter administra afiliados, servicios, packs, cobros, clases y acceso para clubes, estudios y otras organizaciones.

| Área | Quién la usa | Dónde |
|---|---|---|
| Panel | Dueño y staff | `{tu-local}.faciliter.xyz` |
| Web pública | Visitantes y afiliados | `{tu-local}.faciliter.xyz` |
| Mi portal | Afiliados | `{tu-local}.faciliter.xyz/portal` |

El local conecta su propia cuenta de Mercado Pago. Los cobros ingresan a esa cuenta y Faciliter registra el resultado en Caja.

**Captura:** `web-inicio-dashboard.png` — mostrar Inicio del panel Admin con las tarjetas del día y el menú actual.

El staff opera el local desde el panel. El afiliado usa la web pública para conocer el local y **Mi portal** para sus packs, clases, pagos, documentos, avisos y acceso.

## 02. El flujo del afiliado

1. El staff crea **servicios** (acceso libre o por sesiones) y **packs** (la oferta que se cobra).
2. Da de alta al afiliado con su correo de cuenta Faciliter.
3. El afiliado inicia sesión en la web del tenant y accede a **Mi portal**. Allí puede comprar packs, reservar clases, revisar comprobantes y consultar su estado.
4. El local cobra desde **Caja**: efectivo, transferencia acreditada, link de Mercado Pago o Point QR.
5. Si la puerta usa Kuatia, el afiliado abre **Mi portal → Acceso** y presenta su credencial con Kuatia Wallet web. Puede abrir el enlace, compartirlo o escanear el QR con la cámara del teléfono. Con ZKTeco, se identifica en el dispositivo.

Para el recorrido del afiliado, consultá [`Portal de afiliados y usuarios`](/docs/portal-afiliados).

- **Servicio:** lo que ofrece el local. Puede ser acceso libre o por sesiones.
- **Pack:** oferta comercial con uno o más servicios.
- **Sesión suelta:** una clase que se compra sin pack, si el servicio tiene precio de drop-in.
- **Caja:** cobros presenciales y administración de débitos.
- **Staff:** personal que opera el panel; un afiliado es un perfil distinto.

## 03. Casos de uso

- **Cuota mensual:** pack mensual de acceso libre. Puede configurarse débito automático.
- **Clases:** packs de créditos o sesiones sueltas; el afiliado reserva en Mi portal.
- **Mixto:** un pack puede combinar acceso libre y créditos de clases.
- **Cobro en el local:** recepción usa Caja, incluido Point QR.
- **Compra online:** el afiliado compra en Mi portal si el tenant conectó Mercado Pago.

---

# Parte 2 — Primeros pasos

## 04. Antes de empezar

Al contratar o al recibir un tenant creado por Faciliter, quedan la dirección `{slug}.faciliter.xyz` y una cuenta de staff con rol Admin.

En la dirección del tenant, elegí **Acceso staff** para entrar al panel. El afiliado ingresa en la web pública del mismo tenant y abre **Iniciar sesión / Mi portal**. La cuenta usa el correo que el staff cargó en Afiliados.

**Captura:** `web-login-staff.png` — mostrar el inicio de sesión vigente del staff, sin accesos de demo.

## 05. Configurar el sistema

**Pantalla:** Panel Admin → **Config**. Los ajustes operativos y la conexión de Mercado Pago se administran desde esta pantalla.

### Operación y puerta

- **Kuatia Wallet web:** la vista Verificar genera la solicitud OID4VP para la puerta. En el portal, el afiliado presenta su credencial mediante el QR o el enlace compartible de Kuatia Wallet web.
- **ZKTeco:** el afiliado se identifica en el dispositivo por huella, tarjeta o PIN. La vinculación de identificadores depende de la instalación y del modelo; coordiná la puesta en marcha con soporte.
- **Reservas:** configurá el límite para cancelar, la lista de espera y el ingreso tardío.
- **Acceso y deuda:** definí la tolerancia de deuda y las reglas de múltiples ingresos.
- **Descuentos de Caja:** configurá por separado los descuentos predeterminados para efectivo y transferencia. Caja permite ajustarlos en cada cobro.

**Capturas:** `dashboard-config.png` y `dashboard-config-2.png` — mostrar la configuración operativa y Mercado Pago/Point QR.

### Mercado Pago: conexión OAuth para links y cobros

En **Config → Mercado Pago**, elegí **Conectar Mercado Pago**, iniciá sesión con la cuenta del negocio y autorizá a Faciliter. Al volver, Config muestra el estado de conexión. No hace falta crear una aplicación en Developers ni copiar claves para la conexión habitual.

La conexión autoriza al tenant a generar links de cobro y administrar débitos automáticos. Si expira o se revoca, usá **Reconectar Mercado Pago**; también permite cambiar la cuenta conectada. **Probar** verifica la conexión. **Desconectar** interrumpe los cobros online. La conexión manual con access token y public key es una alternativa avanzada, no el recorrido normal.

La cuenta conectada es del negocio. Mercado Pago aplica comisiones y plazos según la cuenta y el medio de cobro; revisalos en Mercado Pago antes de definir precios o descuentos.

Para la configuración de la cuenta, OAuth y Point QR, consultá [`Config`](/docs/config).

## 06. Crear servicios

**Pantalla:** Panel Admin → **Servicios** → **+ Nuevo**.

- **Acceso libre:** derecho a ingresar durante el horario del local, sin reservar clase.
- **Por sesiones:** clase o turno que se agenda en Sesiones. Puede tener precio de drop-in.

Un servicio inactivo no se vende ni se agrega a packs nuevos.

**Captura:** `web-servicios-alta.png` — mostrar el alta de un servicio de acceso libre.

## 07. Crear packs

**Pantalla:** Panel Admin → **Packs**.

Un pack tiene nombre, precio, período de facturación y uno o más servicios. Para servicios por sesiones, indicá los créditos incluidos.

- **Mensual:** se renueva; puede usarse con débito automático.
- **Único:** cobro puntual, por ejemplo un bloque de créditos.
- **Mixto:** combinación de acceso libre y servicios por sesiones.

Un pack ya vendido se desactiva para dejar de ofrecerlo; no se borra su historial.

**Captura:** `web-packs-lista.png` — mostrar un pack de prueba activo.

## 08. Agendar sesiones

**Pantalla:** Panel Admin → **Sesiones**. Las clases se crean para servicios por sesiones.

- **Calendario:** clases publicadas, horarios y cupos.
- **Recurrencias:** reglas que generan sesiones periódicas.
- **Roster:** afiliados inscriptos.
- **Lista de espera:** orden de afiliados a la espera de un lugar.

El afiliado reserva desde **Mi portal → Clases**. Según el servicio y su pack, usa créditos o compra una sesión suelta. Puede cancelar dentro del plazo configurado y consultar sus reservas en **Mis clases**. Para más información, consultá [`Portal de afiliados y usuarios`](/docs/portal-afiliados).

**Captura:** `web-sesiones-calendario.png` — mostrar el calendario de sesiones en el panel.

## 09. Crear personal (staff)

**Pantallas:** Panel Admin → **Roles y permisos** y **Staff**.

El rol Admin viene de sistema. Podés ajustar los permisos del rol Entrenador o crear roles propios. Al invitar o dar de alta a una persona, asignale solo los permisos que necesita. El afiliado no es un rol de staff.

**Captura:** `web-staff-lista.png` — mostrar personal de prueba y su rol.

## 10. Crear un afiliado y credenciales

**Pantalla:** Panel Admin → **Afiliados** → **+ Nuevo**.

Cargá nombre y correo; teléfono y documento son opcionales. El afiliado usa la cuenta Faciliter asociada a ese correo para entrar al tenant y abrir Mi portal.

La ficha de Afiliados permite revisar el estado de cuenta y emitir o volver a emitir una credencial según la configuración del tenant. Para una puerta Kuatia, el afiliado presenta la credencial con **Kuatia Wallet web** desde Mi portal. La oferta de credencial puede mostrarse pendiente hasta que el afiliado la acepte en Wallet; reemitir no cobra ni crea un nuevo contrato. Para ZKTeco, la ficha permite administrar los identificadores que correspondan a la instalación. Para el uso del acceso desde el portal, consultá [`Portal de afiliados y usuarios`](/docs/portal-afiliados).

**Captura:** `web-afiliados-lista.png` — mostrar afiliados de prueba.

## 11. Cobrar en Caja y recibir pagos

**Pantalla:** Panel Admin → **Caja → Cobro**.

1. Elegí al afiliado.
2. Agregá packs o sesiones sueltas al carrito.
3. Seleccioná el medio de pago y confirmá solo cuando corresponda:
   - **Efectivo:** registra el cobro en el cierre.
   - **Transferencia:** registrala después de comprobar que el dinero se acreditó en la cuenta del negocio.
   - **Mercado Pago (link):** generá un link desde la cuenta conectada. El afiliado lo abre y paga; Caja refleja el resultado.
   - **Mercado Pago Point (QR en caja):** generá el QR desde Caja. El afiliado lo escanea con Mercado Pago; esperá la confirmación del pago antes de finalizar el cobro.
4. Al aprobarse el pago, el pack queda activo o la sesión queda reservada y el comprobante aparece en el Historial del portal.

No registres una transferencia como acreditada antes de verla en la cuenta. Faciliter no verifica transferencias bancarias.

**Captura:** `caja-carrito-con-opciones-mp.png` — mostrar el carrito de Caja con los medios de pago, usando datos de prueba.  
**Captura:** `web-caja-link-mp.png` — mostrar un link/QR de prueba de Mercado Pago.  
**Captura:** `web-caja-point-qr.png` — mostrar Point QR generado en Caja; pendiente de una captura identificada con ese nombre.

### Configurar Point QR

Primero conectá Mercado Pago por OAuth. En **Config → Mercado Pago / Point QR**, cargá la información del domicilio comercial que solicita el formulario y creá la sucursal y la caja QR. Los recursos se crean en la cuenta de Mercado Pago conectada; usá una dirección y coordenadas correctas. Después, Point QR queda disponible como medio de pago en Caja.

El descuento de Point QR se configura aparte del descuento en efectivo/transferencia y del descuento para link. Los valores iniciales documentados son 5 % para Point QR y 0 % para link; confirmá los valores mostrados en Config antes de operar, porque el tenant puede haberlos cambiado.

Para pasos detallados de OAuth y Point QR, consultá [`Config`](/docs/config).

### Débitos y cierre

El débito automático se ofrece para packs mensuales mediante Mercado Pago. El afiliado autoriza el cobro en Mercado Pago; Faciliter no almacena los datos de tarjeta. En Caja → **Débitos** podés revisar estados, reenviar el link de autorización o dar de baja cobros futuros.

**Cierre** muestra los movimientos del día y el arqueo de efectivo. **Reportes** permite consultar cobros y devoluciones por rango de fechas.

---

# Parte 3 — Panel de administración

El dashboard reúne las herramientas de operación de la organización para el dueño y el staff. Los apartados visibles y las acciones disponibles dependen del rol y sus permisos.

## Afiliados

El padrón de afiliados, estado de cuenta, contratos, credenciales y documentos vinculados. Borrar una ficha puede estar limitado si tiene historial.

## Carpeta y documentos

Las carpetas pueden contener notas y archivos. El afiliado consulta los documentos propios desde **Mi portal → Documentos**; el staff los gestiona desde el panel con sus permisos.

**Captura:** `web-carpeta.png` — mostrar una carpeta con contenido de prueba.

## Importar afiliados

Afiliados → **Importar** permite revisar una planilla antes de confirmar la carga. Usá la vista previa, comprobá filas válidas y duplicados y confirmá la importación únicamente después de revisar el resultado. Los datos no incluidos en la importación —como pagos o contratos históricos— deben cargarse en Faciliter según corresponda.

**Captura:** `web-importar.png` — mostrar una planilla de prueba revisada.

## Staff y roles

Gestioná en **Roles y permisos** qué puede consultar o modificar cada persona del equipo. Las funciones sensibles, como administrar usuarios o importar afiliados, deben restringirse a roles de confianza.

## Caja

Caja es el mostrador: cobros, links de Mercado Pago, Point QR, transferencias ya acreditadas, efectivo y débitos automáticos. No es el historial de todos los períodos: usá Reportes para consultar movimientos y Cierre para el arqueo diario.

**Captura:** `web-caja-debitos.png` — mostrar la administración de débitos mediante link de autorización, no datos de tarjeta.

## Vencimientos, cierre, gastos y reportes

- **Vencimientos:** contratos mensuales próximos a vencer o dentro de la tolerancia configurada.
- **Cierre:** arqueo de efectivo y resumen del día.
- **Gastos:** registra gastos del negocio y sus comprobantes.
- **Reportes:** consulta cobros, devoluciones y, según permisos, gastos de un período.

## Solicitudes de devolución

El afiliado puede solicitar una devolución desde **Mi portal → Historial → Comprobante**. El staff revisa la solicitud en el panel y la acepta o rechaza según el caso y sus permisos. Una devolución aprobada queda reflejada en Caja/Reportes y en el historial del afiliado.

## Puerta

En **Operación → Puerta**, el staff puede verificar accesos, usar pase manual con motivo y revisar el historial.

### Kuatia Wallet web

La puerta muestra un QR OID4VP. El afiliado lo escanea con la cámara del teléfono o abre/comparte el enlace de Kuatia Wallet web. En Wallet presenta la credencial que tiene guardada; Faciliter muestra el resultado de la verificación. No hace falta modificar el `request_uri` emitido por Kuatia: el enlace de presentación agrega `client_id` y `request_uri` con el formato que espera Wallet.

**Captura:** `web-puerta-verificar.png` — mostrar una verificación de prueba aprobada, sin datos personales reales.

### ZKTeco

Con ZKTeco, el afiliado se identifica en el dispositivo. La vinculación del número de dispositivo y la instalación dependen del modelo; coordiná su configuración con soporte.

**Captura:** `web-puerta-historial.png` — mostrar resultados de prueba sin datos personales reales.

## Avisos

El panel permite configurar avisos y correos. El afiliado consulta su bandeja y preferencias en **Mi portal → Avisos**; los pasos para el portal están en [`Portal de afiliados y usuarios`](/docs/portal-afiliados).

**Captura:** `web-avisos.png` — mostrar una plantilla de aviso del panel.

## Web pública del tenant

En **Sistema → Web pública** editás la portada, sliders, imágenes, enlaces y vista previa de la página pública del tenant. Revisá el contenido y el tema claro/oscuro antes de publicar. Publicar actualiza la web pública del tenant.

**Capturas:** `editor-web-tennant.png` y `editor-web-tennant-2.png` — mostrar el editor y su vista previa; la segunda imagen va debajo de la primera.  
Para el recorrido completo, consultá [`Web del tenant`](/docs/web-tenant).

## Auditoría y asistente

**Auditoría** registra operaciones relevantes y quién las realizó. El asistente puede orientar sobre el uso y proponer algunas acciones, pero los cambios se confirman en los flujos autorizados del panel.

---

# Parte 4 — Tu cuenta y el plan

## Cuenta Faciliter

Cada persona usa una cuenta Faciliter asociada a su correo. El propietario, el staff y el afiliado ingresan con la cuenta habilitada para su perfil. Si la contraseña no funciona o hace falta recuperar acceso, escribí a soporte.

## Contratar Faciliter

En faciliter.xyz elegí **Contratar**, iniciá sesión o creá tu cuenta, seleccioná el plan y configurá nombre y subdominio del tenant. La autorización de Mercado Pago para pagar el plan Faciliter es independiente de conectar Mercado Pago para cobrar en tu propio local.

## Mi cuenta y Plan / Uso

**Mi cuenta** permite revisar los datos de la cuenta y los tenants asociados. En el panel, **Sistema → Plan / Uso** muestra el estado del plan del tenant y su uso.

## Eliminar la cuenta

Leé cuidadosamente la confirmación antes de eliminar una cuenta. La baja puede cancelar reservas o débitos asociados; el historial comercial del tenant puede conservarse de acuerdo con las obligaciones de registro.

## Soporte

Para problemas, cobros o dudas que no cubre esta guía, escribí a **faciliterapps@gmail.com**.
