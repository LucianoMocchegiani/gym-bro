# Caja

**Caja** (`/dashboard/caja`) es el mostrador: donde el staff registra cobros **presenciales** y ve el día. No es la factura AFIP. Dos pestañas:

- **Cobro:** elegís el afiliado, el catálogo (Packs o Servicios para una clase suelta) y armás el carrito. Medios:
  - **Efectivo:** queda registrado al toque y suma al efectivo del Cierre.
  - **Transferencia:** para transferencias al alias/CBU del gym que el staff **ya vio acreditadas** (Faciliter no las verifica). Campo opcional **Referencia** (nº de operación o quién transfirió), que sale en el comprobante. No suma al efectivo del Cierre: va en «digital».
  - **Generar link MP** muestra un QR con **Copiar** / **Abrir**; la pantalla espera hasta que Mercado Pago lo apruebe. El tilde de **débito automático** aparece solo con un pack mensual y Mercado Pago conectado.
- **Descuento por pago sin comisión:** con Efectivo o Transferencia, Caja precarga el % por defecto del gym (Config → Operación; **7,6 %** si no lo cambiaron, que es lo que cobra MP con la plata al instante: 6,29 % + IVA). El staff lo puede cambiar o poner 0 en cada venta (máx. 99 %); si difiere del default queda en Auditoría. Se aplica a cada ítem del carrito, redondeado al peso. Con link MP o débito no hay descuento. El comprobante y Reportes muestran precio de lista y descuento.
- **Débitos:** la cola de débitos automáticos (topic `debito`).

La plata de Mercado Pago entra a la cuenta MP **del negocio**, no a Faciliter. Cómo conectar token, app y webhooks: topic `mercadopago`.

El **cierre / arqueo** está en **Cierre** (`/dashboard/arqueo`): compara el efectivo esperado con el declarado. El esperado cuenta solo efectivo: cobros − devoluciones − gastos en efectivo (topic `gastos`). Al lado, el **digital esperado** (MP, transferencias cobradas en Caja, gastos por transferencia o tarjeta) y el neto del día: informativos, no se cierran. La cola de packs mensuales por vencer: **Vencimientos** (`/dashboard/vencimientos`).

El asistente resume la caja. **No cobra**, no arma links de pago ni cierra el día. Para cobrar, usá Caja.

Hace falta permiso de caja.
