# Caja

**Caja** es el mostrador: donde el staff registra cobros **presenciales** (sobre todo efectivo) y ve el **día**. No es la factura AFIP.

También quedan asentados los cobros por **Mercado Pago**, pero esa plata entra a la cuenta MP **del negocio**, no a Faciliter. Cómo conectar token, app y webhooks: topic `mercadopago`. En Caja está la cola de **débitos automáticos** (packs mensuales).

El **cierre / arqueo** compara el efectivo esperado con el declarado. El esperado cuenta solo efectivo: cobros en efectivo − devoluciones en efectivo − gastos en efectivo (topic `gastos`). Al lado está el **digital esperado** (MP, transferencia, tarjeta) y el neto del día: informativos, no se cierran. Pantalla: **Caja** (`/caja`). El cierre del día: **Cierre** (`/arqueo`). La cola de packs mensuales por vencer: **Vencimientos** (`/vencimientos`).

El asistente resume la caja. **No cobra** ni cierra el día. Para cobrar, usá Caja.

Hace falta permiso de caja.
