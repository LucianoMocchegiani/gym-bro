# Guía de vistas (panel y portal)

Resumen de cómo **se ven y se usan** las pantallas. Es el contenido de la guía pública `/docs`; las capturas se consultan allí. En el Admin, para abrir una ruta, usá `suggest_nav`.

Fuera de esta guía: Super Admin. **No existen todavía:** rutinas por días, notificaciones push, tienda de productos físicos, noticias del local, bandeja de avisos del staff.

## Dos espacios

| Espacio | Quién | Dónde |
|------|--------|--------|
| Panel (web) | Dueño, recepción, profesores (staff) | `{slug}.faciliter.xyz/dashboard` |
| Web del tenant y portal | Público y afiliados | `{slug}.faciliter.xyz`: portada, planes y **Mi portal** del afiliado |
| App Faciliter | Uso de acceso Kuatia | Se necesita para escanear el QR de la puerta |

El dinero del afiliado va al Mercado Pago **del negocio** y se registra en Caja. Faciliter no se queda con el cobro. Efectivo: solo se registra.

El afiliado opera desde **Mi portal**: clases, reservas, tienda, carrito, historial, documentos y avisos. La app no es el recorrido general; sigue siendo necesaria para escanear el QR de puerta Kuatia.

## Menú del panel

A la izquierda, agrupado:

- **Operación:** Inicio, Puerta, Caja, Vencimientos, Cierre, Gastos, Solicitudes de devolución, Reportes.
- **Personas:** Afiliados, Staff, Roles y permisos.
- **Catálogo:** Servicios, Packs, Sesiones.
- **Sistema:** Config, Avisos (plantillas), Web del gym, Plan / Uso, Auditoría.

Cada uno ve solo lo que su rol permite. Arriba, el avatar abre **Mi cuenta**. Abajo a la derecha: burbuja del **asistente** (consulta datos del tenant y propone altas/ediciones que confirmás con un botón; puede equivocarse; no cobra).

Si el plan Faciliter venció hace más de 3 días, el menú queda limitado a Plan / Uso con un aviso para renovar (topic `plan`).

## Inicio (panel)

Saludo y tarjetas del día (afiliados activos, ingresos, accesos, socios sin pack, sesiones de hoy). Pueden estar en cero. No es el portal del afiliado.

## Login

- En `{slug}.faciliter.xyz/login`, staff y afiliados usan su cuenta Faciliter (mail y contraseña o **Continuar con Google**). El tenant sale de la URL. Staff va al panel (`/dashboard`), afiliado a **Mi portal** (`/portal`); si es ambas cosas, elige. El avatar abre **Mi cuenta** (`/cuenta`).
- No hay «olvidé mi contraseña». Detalle de cuenta y contraseñas: topic `cuenta`.

## Config

En **Config** (`/dashboard/config`) se elige la modalidad de acceso (Kuatia o ZKTeco), se ajustan reglas operativas y se conecta la cuenta Mercado Pago del negocio con OAuth. No hay que crear una app MP ni copiar claves para la conexión normal. La preparación de Point QR requiere crear sucursal y caja con dirección y coordenadas reales. Guía detallada: `/docs/config`; tema MP: topic `mercadopago`.

El afiliado no ve Config. Si el tenant usa ZKTeco, el portal muestra el identificador vinculado o el DNI de respaldo; no registra números nuevos en el aparato.

## Servicios

Catálogo de lo que el local ofrece. **Gym** (en la demo) = acceso libre, sin drop-in. **Funcional** = por sesiones, con precio de clase suelta. Un servicio **inactivo** no se vende ni entra en un pack nuevo.

## Packs

La oferta que se cobra. Puede juntar varios servicios (acceso libre + créditos, mensual o único). Cancelar el pack pierde **todo** el combo. Un pack vendido no se borra: se da de baja.

## Sesiones

Solo servicios por sesiones. Pestañas **Calendario** y **Recurrencias**. Cada clase tiene **Datos** (horario, cupo, profesor, Ampliar cupo, Cancelar sesión), **Roster** (quién reservó y con qué pagó) y **Lista de espera**. Cancelar una sesión devuelve el crédito y avisa a los que reservaron. Desactivar una recurrencia cancela las sesiones futuras. Topic `sesiones`.

## Staff y roles

Roles y permisos, después Staff. Admin es de sistema (no se edita). Alta de staff: la contraseña es opcional (vacía → `ChangeMe123!` temporal; si ya tiene cuenta Faciliter, conserva la suya). Cada staff tiene **carpeta**: topic `carpeta`. El socio no ve Staff. El dashboard incluye **Mi credencial**: Kuatia o identificadores ZKTeco según la modalidad del tenant.

## Afiliados

Alta: nombre, mail, documento, etc. La contraseña inicial es opcional; si queda vacía, recibe `ChangeMe123!` temporal. Estados Activo / Suspendido / Inactivo. Estado de cuenta: contratos, créditos, deuda y reservas. **Re-emitir** una oferta Kuatia no cobra. En **Mi portal → Acceso** el afiliado gestiona su credencial según la modalidad del tenant; la aceptación de una oferta Kuatia se completa en Kuatia Wallet. **Carpeta** en la grilla (topic `carpeta`). **Importar**: migración desde Excel/CSV + fotos y carpeta (topic `migracion`).

## Caja

Mostrador, dos pestañas:

- **Cobro:** afiliado, catálogo (Packs o Servicios), carrito, efectivo, transferencia, link de Mercado Pago o **Mercado Pago Point (QR en caja)**. El QR Point requiere configurar la sucursal/caja en Config; Caja valida el pago antes de emitir comprobante. Guía: `/docs/config` y topic `caja`.
- **Débitos:** débitos automáticos de packs mensuales. El asistente lista; **no cobra**. Topics `caja`, `debito`.

## Vencimientos

Cola de packs mensuales por vencer o en tolerancia. Filtros por días, Tolerancia, Débito, A mano. Atajos Ficha / Caja / Débitos. Los mails de pack por vencer y vencido los manda el sistema según Avisos. Topic `vencimientos`.

## Cierre

Totales **de ese día** de negocio y arqueo de efectivo. Si cobraste otro día, acá puede aparecer $0. Efectivo esperado = cobros − devoluciones − gastos en efectivo. Digital esperado (MP, transferencia, tarjeta) y neto del día: informativos. Desde los movimientos se puede **Devolver** un cobro con permiso.

## Gastos

Lo que paga el tenant: fecha, monto, Fijo/Variable, medio, etiqueta, nota y hasta 5 comprobantes. Solo el efectivo resta en el Cierre. Topic `gastos`.

## Solicitudes de devolución

El afiliado solicita desde el historial de comprobantes del portal. El staff filtra, abre y ejecuta con motivo tipificado escribiendo **DEVOLVER**, o rechaza. Topic `devoluciones`.

## Reportes

Rango de fechas: qué se cobró (pack, drop-in, medio, staff) y devoluciones. Con permiso de gastos, también gastos y resultado.

## Puerta

Pestañas **Verificar**, **Pase manual**, **Historial**. Con Kuatia, el afiliado escanea el QR de Verificar desde la app Faciliter y el panel muestra PERMITIDO / DENEGADO con motivo. ZKTeco es opcional y depende del modelo: se coordina con los técnicos. Topic `puerta`.

## Avisos

Sistema → **Avisos**: una tarjeta por evento (asunto y texto editables, se puede apagar). El afiliado los ve en **Mi portal → Avisos** y por mail según sus preferencias. Sin push. Topic `avisos`.

## Web del tenant

Sistema → **Web del gym** (`/dashboard/web`) permite administrar la página pública `{slug}.faciliter.xyz`, su portada, sliders, colores y enlaces. Guía independiente: `/docs/web-tenant`.

## Auditoría

Quién hizo qué y cuándo, con detalle antes/después. Lo que confirma el asistente también queda.

## Cuenta y plan Faciliter

Cuenta Faciliter, Mi cuenta, eliminar cuenta: topic `cuenta`. Contratar Faciliter (`/empezar`), Plan / Uso, renovación y gracia: topic `plan`.

## Sitio de capturas

- `/docs` índice
- `/docs/config`
- `/docs/web-tenant`
- `/docs/primeros-pasos`, `/docs/modulos` y `/docs/cuenta`

Si no sabés cómo se ve algo, decilo y mandá a esa guía. No inventes botones que no estén acá.
