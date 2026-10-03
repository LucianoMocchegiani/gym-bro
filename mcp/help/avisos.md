# Avisos (notificaciones al socio)

Dos lados de lo mismo:

- **Panel → Sistema → Avisos** (`/avisos`): una tarjeta por evento. Cada una se puede **apagar** y tiene asunto y texto editables, con variables como `{{nombre}}` o `{{gym}}`. Requiere permiso de configuración.
- **App → Inicio → Avisos:** la bandeja del socio (nuevos arriba). En **Ajustes → Avisos → Correo por tipo** elige qué le llega también por mail. La bandeja de la app no se apaga.

Eventos:

- Pago acreditado.
- Reserva confirmada.
- Reserva cancelada (también cuando el gym cancela la sesión).
- Lugar en lista de espera.
- Devolución.
- Pack por vencer (caja) y Pack por vencer (débito).
- Pack vencido (tolerancia).
- Débito: cobro no acreditado y Débito: mandato fallido.

**No hay:** notificaciones push, WhatsApp, ni bandeja de avisos para el staff. El aviso llega por mail y a la bandeja de la app.

Los mails del **plan Faciliter** al dueño son otra cosa (topic `plan`): no se editan acá.

El asistente **no** edita plantillas ni manda avisos.
