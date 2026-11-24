# Caja

**Caja** (`/dashboard/caja`) es el mostrador: el staff registra los cobros presenciales. No es la factura AFIP. Hay pestañas **Cobro** y **Débitos**.

## Formas de cobro

- **Efectivo:** queda registrado al instante y suma al efectivo del Cierre.
- **Transferencia:** registrala solo cuando ya viste la acreditación en la cuenta del tenant. No suma al efectivo del Cierre; va en «digital».
- **Mercado Pago (link):** genera un link/QR para que el afiliado pague a distancia. Caja espera la aprobación.
- **Mercado Pago Point (QR en caja):** genera un QR dinámico en el POS configurado para el tenant. El afiliado lo escanea con Mercado Pago. Caja consulta a Mercado Pago y emite el comprobante solo cuando confirma el pago.

Point QR requiere que el tenant haya conectado Mercado Pago en Config y creado una sucursal y una caja QR con su dirección real y coordenadas. La configuración está en `/docs/config`. No confundas Point QR (cobro presencial en Caja) con el link MP.

Para Point QR, el descuento predeterminado inicial es 5 %; para el link MP, 0 %. Caja muestra el descuento y permite ajustarlo para cada venta. El descuento en efectivo y transferencia se configura por separado en Config → Operación.

La pestaña **Débitos** administra débitos automáticos mensuales. El cierre/arqueo está en **Cierre** (`/dashboard/arqueo`). El asistente explica y consulta; no cobra ni crea QR.

Hace falta permiso de Caja.
