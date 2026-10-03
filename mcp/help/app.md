# App Faciliter (socio y staff)

La misma app para socios y staff. Se entra con la **cuenta Faciliter** (topic `cuenta`); si hay varios gyms o perfiles, se elige en **Tus gyms**.

Pestañas: **Inicio | Acceso | Ajustes**.

## Socio

- **Inicio:** packs vigentes (o aviso de que no tiene), deuda si hay, atajos **Sesiones**, **Tienda**, **Documentos** y **Avisos**, y próximas clases.
- **Sesiones:** calendario del mes y clases del día. **Reservar** (con crédito del pack), **Al carrito** (clase suelta), **Reservada**, **Unirme a la lista** / **Salir de la lista** si está llena, y **Mis clases**. Cancelar depende de las horas de cancelación del gym.
- **Tienda:** Packs y Sesiones (clase suelta), carrito, **Pagar con Mercado Pago** (link o QR del Mercado Pago del gym). **Historial** (menú ⋮) de pagos: **Ver comprobante** → Compartir o **Solicitar devolución** (topic `devoluciones`).
- **Documentos:** notas y archivos de su carpeta, solo lectura (topic `carpeta`).
- **Avisos:** su bandeja (topic `avisos`).
- **Acceso:** **Escanear** (el QR de la puerta o una credencial) y **Credenciales** (aceptar las pendientes y ver las guardadas). Topic `puerta`.
- **Ajustes:** Cambiar gym, Cambiar / Crear contraseña (aviso si sigue con `ChangeMe123!`), Avisos → Correo por tipo, Wallet, tema, Cerrar sesión, **Eliminar cuenta**.

## Staff

Al elegir el perfil staff en Tus gyms: Sesiones, **Caja** (si tiene permiso) y Documentos. Lo demás se hace en el panel web.

## Web del gym

Además de la app, cada gym tiene su web pública en `{slug}.faciliter.xyz`:

- **Planes:** los packs activos con precio. **Comprar** aparece solo si el gym conectó Mercado Pago; si no, dice que se contrata en el gym.
- **Comprar:** entra o crea su cuenta Faciliter (mail o Google). Si no es socio, completa nombre, DNI y teléfono (opcional) y paga con el Mercado Pago del gym; **queda dado de alta recién cuando el pago se aprueba** (si no paga, no aparece en Afiliados). Si ya es socio, solo paga. Vuelve a **Mi cuenta** con el pack activo cuando el pago se aprueba.
- **Mi cuenta** (`/cuenta`): packs vigentes con créditos y vencimiento, resultado del pago y comprobantes. Reservas y calendario siguen en la app.

## Lo que no existe

Registro desde la app (sí desde la web del gym al comprar), “olvidé mi contraseña”, notificaciones push, rutinas por días (la rutina va como archivo en la carpeta), tienda de productos físicos, noticias del local, QR del socio generado por la app.

Si piden capturas: `/docs/modulos` (App del socio). El asistente no ve la app del socio.
