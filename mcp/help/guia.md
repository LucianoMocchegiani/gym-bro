# Guía de vistas (panel y app)

Resumen de cómo **se ven y se usan** las pantallas. Es el mismo contenido que la guía del sitio `/docs` (4 capítulos: Qué es, Primeros pasos, Módulos, Tu cuenta y el plan). **No tenés las imágenes:** si piden una captura o “mostrame la pantalla”, mandalos a `/docs`. En el Admin, para abrir una ruta, usá `suggest_nav`.

Fuera de esta guía: Super Admin. **No existen todavía:** rutinas por días, notificaciones push, tienda de productos físicos, noticias del local, bandeja de avisos del staff.

## Dos caras

| Cara | Quién | Dónde |
|------|--------|--------|
| Panel (web) | Dueño, recepción, profesores (staff) | `{slug}.faciliter.xyz/dashboard` |
| Web del gym | Público y socios | `{slug}.faciliter.xyz`: planes, comprar online, **Mi cuenta** del socio |
| App | El afiliado (socio) y el staff | App Faciliter en el celular |

El dinero del socio va al Mercado Pago **del negocio** y se registra en caja. Faciliter no se queda con el cobro. Efectivo: solo se registra.

El socio **no ve** el tablero del staff. En la app ve su pack, clases y Acceso.

## Menú del panel

A la izquierda, agrupado:

- **Operación:** Inicio, Puerta, Caja, Vencimientos, Cierre, Gastos, Solicitudes de devolución, Reportes.
- **Personas:** Afiliados, Staff, Roles y permisos.
- **Catálogo:** Servicios, Packs, Sesiones.
- **Sistema:** Config, Avisos (plantillas), Plan / Uso, Auditoría.

Cada uno ve solo lo que su rol permite. Arriba, el avatar abre **Mi cuenta**. Abajo a la derecha: burbuja del **asistente** (consulta datos del gym y propone altas/ediciones que confirmás con un botón; puede equivocarse; no cobra).

Si el plan Faciliter venció hace más de 3 días, el menú queda limitado a Plan / Uso con un aviso para renovar (topic `plan`).

## Inicio (panel)

Saludo y tarjetas del día (afiliados activos, ingresos, accesos, socios sin pack, sesiones de hoy). Pueden estar en cero. No es la app del socio.

## Login

- **Web del gym (socios y staff):** en `{slug}.faciliter.xyz/login`, con la **cuenta Faciliter** (mail y contraseña o **Continuar con Google**). El gym sale de la URL. Staff va al panel (`/dashboard`), socio a **Mi cuenta** (`/cuenta`); si es las dos cosas, elige. Las rutas viejas del panel (`/caja`, `/puerta`…) redirigen solas a `/dashboard/...`.
- **App:** **Faciliter · Tu cuenta**: mail y contraseña de la cuenta Faciliter (sin slug), o Google / Apple si están disponibles. Si la cuenta está en varios gyms (o es socio y staff), elige en **Tus gyms**.
- No hay registro desde la app (sí en la web del gym al comprar) ni “olvidé mi contraseña”. Detalle de cuenta y contraseñas: topic `cuenta`.

## Config

Una pantalla, dos bloques:

- **Operación:** **Puerta** (QR con la app Faciliter, o Acceso ZKTeco opcional), horas de cancelación, modo lista de espera, ingreso tardío, tolerancia de deuda, multi-ingreso por día con tope diario.
- **Mercado Pago:** cuenta del negocio. **Conectar Mercado Pago** → autorizar en MP con la cuenta del gym; sin crear app ni pegar claves. Detalle, reconexión y conexión manual: topic `mercadopago`.

El socio no ve Config; nota el efecto (pagar online, cancelar, entrar con deuda).

## Servicios

Catálogo de lo que el local ofrece. **Gym** (en la demo) = acceso libre, sin drop-in. **Funcional** = por sesiones, con precio de clase suelta. Un servicio **inactivo** no se vende ni entra en un pack nuevo. El socio no tiene menú “Servicios”: lo ve dentro de un pack, en el calendario o como clase suelta.

## Packs

La oferta que se cobra. Puede juntar varios servicios (acceso libre + créditos, mensual o único). Cancelar el pack pierde **todo** el combo. Un pack vendido no se borra: se da de baja. El socio en Tienda → Packs ve el combo, no los ítems sueltos.

## Sesiones

Solo servicios por sesiones. Pestañas **Calendario** y **Recurrencias**. Cada clase tiene **Datos** (horario, cupo, profesor, Ampliar cupo, Cancelar sesión), **Roster** (quién reservó y con qué pagó) y **Lista de espera**. Cancelar una sesión devuelve el crédito y avisa a los que reservaron. Desactivar una recurrencia cancela las sesiones futuras. Topic `sesiones`.

## Staff y roles

Roles y permisos, después Staff. Admin es de sistema (no se edita). Alta de staff: la contraseña es opcional (vacía → `ChangeMe123!` temporal; si ya tiene cuenta Faciliter, conserva la suya). Cada staff tiene **carpeta**: topic `carpeta`. El socio no ve Staff.

## Afiliados

Alta: nombre, mail, documento, etc. La **contraseña inicial es opcional**: vacía → `ChangeMe123!` temporal y la app le avisa que la cambie; si ya tiene cuenta Faciliter, conserva la suya. Entra a la app con ese mail (sin slug). Estados Activo / Suspendido / Inactivo. Estado de cuenta: contratos, créditos, deuda, reservas. Credencial: PENDING (espera Aceptar en la app) / ACCEPTED. **Re-emitir** no cobra. **Carpeta** en la grilla (topic `carpeta`). **Importar**: migración desde Excel/CSV + fotos y carpeta (topic `migracion`).

## Caja

Mostrador, dos pestañas:

- **Cobro:** afiliado, catálogo (Packs o Servicios), carrito, **Efectivo** o **Generar link MP** (muestra QR + Copiar / Abrir y espera hasta Aprobado).
- **Débitos:** débitos automáticos de packs mensuales. Cola **Pendiente / link**, **Reintentando**, **Fallidos**, **Todos**. Por socio: **Abrir checkout MP**, **Copiar link**, **Próximo pack**, **Regenerar link**, **Dar de baja**. No hay formulario de tarjeta: el socio autoriza en Mercado Pago con el link.

El tilde de débito aparece solo con un pack mensual y Mercado Pago. El asistente lista; **no cobra**. Topics `caja`, `debito`.

## Vencimientos

Cola de packs mensuales por vencer o en tolerancia. Filtros por días, Tolerancia, Débito, A mano. Atajos Ficha / Caja / Débitos. Los mails de pack por vencer y vencido los manda el sistema según Avisos. Topic `vencimientos`.

## Cierre

Totales **de ese día** de negocio y arqueo de efectivo. Si cobraste otro día, acá puede aparecer $0. Efectivo esperado = cobros − devoluciones − gastos en efectivo (contra eso se cierra, una vez por día). Digital esperado (MP, transferencia, tarjeta) y neto del día: informativos. Desde los movimientos se puede **Devolver** un cobro con permiso.

## Gastos

Lo que paga el gym: fecha, monto, Fijo/Variable, medio, etiqueta del gym, nota y hasta 5 comprobantes. Solo el efectivo resta en el Cierre. Topic `gastos`.

## Solicitudes de devolución

El socio pide desde la app (Historial → Ver comprobante → **Solicitar devolución**). El staff filtra, abre y ejecuta con motivo tipificado escribiendo **DEVOLVER**, o rechaza. Topic `devoluciones`.

## Reportes

Rango de fechas: qué se cobró (pack, drop-in, medio, staff) y devoluciones. Con permiso de gastos, también gastos y resultado.

## Puerta

Pestañas **Verificar**, **Pase manual**, **Historial**. Con QR: el socio escanea el QR de Verificar desde App → Acceso → Escanear y el panel muestra PERMITIDO / DENEGADO con motivo. ZKTeco es opcional y depende del modelo: se coordina con los técnicos de Faciliter. Topic `puerta`.

## Avisos

Sistema → **Avisos**: una tarjeta por evento (asunto y texto editables, se puede apagar). El socio los ve en App → Inicio → Avisos y por mail según Ajustes. Sin push. Topic `avisos`.

## Auditoría

Quién hizo qué y cuándo, con detalle antes/después. Lo que confirma el asistente también queda.

## App

Pestañas **Inicio | Acceso | Ajustes**. Inicio con atajos Sesiones, Tienda, Documentos y Avisos. Tienda con carrito y Mercado Pago, Historial → Ver comprobante → Solicitar devolución. Acceso: Escanear / Credenciales. Ajustes: Cambiar gym, contraseña, avisos por mail, Wallet, tema, cerrar sesión, eliminar cuenta. Detalle: topic `app`.

## Cuenta y plan Faciliter

Cuenta Faciliter, Mi cuenta, eliminar cuenta: topic `cuenta`. Contratar Faciliter (`/empezar`), Plan / Uso, renovación y gracia: topic `plan`.

## Cómo arrancar un local (orden)

Config (Puerta y MP) → Servicios → Packs → Sesiones si hay clases → Staff/roles → Afiliados (a mano o **Importar**) → cobrar en Caja o que el socio pague en la app.

## Sitio de capturas

- `/docs` índice
- `/docs/que-es`
- `/docs/primeros-pasos`
- `/docs/modulos`
- `/docs/cuenta`

Si no sabés cómo se ve algo, decilo y mandá a esa guía. No inventes botones que no estén acá.
