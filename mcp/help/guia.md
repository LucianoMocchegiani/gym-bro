# Guía de vistas (panel y app)

Texto de cómo **se ven y se usan** las pantallas. Las fotos están en el sitio: `/docs` (Qué es, Primeros pasos, Módulos). **No tenés las imágenes:** si piden una captura o “mostrame la pantalla”, mandalos a `/docs`. En el Admin, para abrir una ruta, usá `suggest_nav`.

Fuera de esta guía: Super Admin, rutinas, avisos, tienda de productos físicos.

## Dos caras

| Cara | Quién | Dónde |
|------|--------|--------|
| Panel (web) | Dueño, recepción, profesores (staff) | `{slug}.faciliter.xyz` |
| App | El afiliado (socio) | App Faciliter en el celular |

El dinero del socio va al Mercado Pago **del negocio** y se registra en caja. Faciliter no se queda con el cobro. Efectivo: solo se registra.

El socio **no ve** el tablero del staff. En la app ve su pack, clases y Acceso.

## Menú del panel

A la izquierda, agrupado:

- **Operación:** Inicio, Puerta, Caja, Cierre, solicitudes de devolución, Reportes.
- **Personas:** Afiliados, Staff, Roles y permisos.
- **Catálogo:** Servicios, Packs, Sesiones.
- **Sistema:** Config (y el resto de sistema).

Abajo a la derecha: burbuja del **asistente** (en el panel consulta datos del gym; puede equivocarse; no cobra).

## Inicio (panel)

Saludo, tarjetas del día (afiliados activos, ingresos, accesos, socios sin pack, sesiones publicadas). Pueden estar en cero. No es la app del socio.

## Login

- **Staff:** “Acceso staff”, nombre del local, email y contraseña.
- **App:** “Acceso afiliado”: slug del local + email + contraseña. No es el mismo formulario.

## Config

Una pantalla, dos bloques: **Operación** (horas de cancelación, lista de espera, ingreso tardío, tolerancia de deuda, multi-ingreso) y **Mercado Pago** (cuenta del negocio). El socio no ve Config; nota el efecto (pagar online, cancelar, entrar con deuda).

## Servicios

Catálogo de lo que el local ofrece. **Gym** (demo) = acceso libre, sin drop-in. **Funcional** = por sesiones, con precio de clase suelta. Un servicio **inactivo** no se vende ni entra en un pack nuevo. El socio no tiene menú “Servicios”: lo ve dentro de un pack, en el calendario o como clase suelta.

## Packs

La oferta que se cobra. Puede juntar varios servicios (ej. Gym + Funcional, mixto, mensual). Componentes: se agregan servicios; si es por sesiones, los créditos. Cancelar el pack pierde **todo** el combo. El socio en Tienda → Packs ve el combo, no los ítems sueltos.

## Sesiones

Solo servicios por sesiones. Pestañas **Calendario** (semana, cupo) y **Recurrencias**. El socio no crea sesiones: reserva. En la app: Sesiones (calendario del mes, día, Reservar / Reservada, Mis clases). Roster = quién reservó esa clase; lista de espera si el cupo está lleno.

## Staff y roles

Roles y permisos, después Staff. Admin es de sistema (no se edita). Profesor se le pueden cambiar permisos (en la demo: no opera Caja). El socio no ve Staff.

## Afiliados

Alta: nombre, email, password, etc. Entra a la app con ese email + slug. Pack se cobra en Caja o Tienda. Estados Activo / Suspendido / Inactivo. Estado de cuenta: contratos, créditos, deuda, reservas. Credencial: PENDING (espera Aceptar en la app) / ACCEPTED (ya en el celular). **Re-emitir** no cobra: pack vigente hoy.

## Caja

Mostrador. Pestaña **Cobro** (afiliado, catálogo Packs o Servicios, carrito, efectivo o link MP). Pestaña **Débitos** (autorizar tarjeta para el mes siguiente; no es un cobro ahora; cola Hoy / Reintentando / Fallidos). El asistente lista; **no cobra**.

## Cierre

Totales **de ese día** de negocio y arqueo de efectivo. Si cobraste otro día, acá puede aparecer $0. El socio no ve Cierre.

## Reportes

Rango de fechas (no el mostrador): qué se cobró (pack, drop-in, medio, staff).

## Puerta

Panel: permitido o denegado + motivo; historial del día. Pase manual si hay permiso.

App → **Acceso:** primero Aceptar la credencial (oferta del pack); después presentar / escanear. No inventes un QR de un cliente real.

## App del socio

Pestañas: **Inicio | Acceso | Ajustes**.

- Inicio: cuenta, pack vigente (ej. Gym + Funcional: acceso libre + créditos), atajos Sesiones y Tienda, próxima clase.
- Sesiones: calendario, día, mis clases.
- Tienda: Packs y Sesiones (drop-in), carrito, Pagar con Mercado Pago, Historial.
- Acceso: credencial / QR.
- Ajustes: cuenta, tema, salir.

Rutinas y avisos todavía no están.

## Cómo arrancar un local (orden)

Config (MP) → Servicios → Packs → Sesiones si hay clases → Staff/roles → Afiliados → cobrar en Caja o que el socio pague en la app.

## Sitio de capturas

- `/docs` índice
- `/docs/que-es`
- `/docs/primeros-pasos`
- `/docs/modulos`

Si no sabés cómo se ve algo, decilo y mandá a esa guía. No inventes botones que no estén acá.
