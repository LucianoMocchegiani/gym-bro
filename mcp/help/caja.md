# Caja

**Caja** (`/caja`) es el mostrador: donde el staff registra cobros **presenciales** y ve el día. No es la factura AFIP. Dos pestañas:

- **Cobro:** elegís el afiliado, el catálogo (Packs o Servicios para una clase suelta) y armás el carrito. **Efectivo** queda registrado al toque. **Generar link MP** muestra un QR con **Copiar** / **Abrir**; la pantalla espera hasta que Mercado Pago lo apruebe. El tilde de **débito automático** aparece solo con un pack mensual y Mercado Pago conectado.
- **Débitos:** la cola de débitos automáticos (topic `debito`).

La plata de Mercado Pago entra a la cuenta MP **del negocio**, no a Faciliter. Cómo conectar token, app y webhooks: topic `mercadopago`.

El **cierre / arqueo** está en **Cierre** (`/arqueo`): compara el efectivo esperado con el declarado. El esperado cuenta solo efectivo: cobros − devoluciones − gastos en efectivo (topic `gastos`). Al lado, el **digital esperado** (MP, transferencia, tarjeta) y el neto del día: informativos, no se cierran. La cola de packs mensuales por vencer: **Vencimientos** (`/vencimientos`).

El asistente resume la caja. **No cobra**, no arma links de pago ni cierra el día. Para cobrar, usá Caja.

Hace falta permiso de caja.
