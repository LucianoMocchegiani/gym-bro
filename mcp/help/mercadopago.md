# Configurar Mercado Pago (tenants)

Explicá primero el método normal de **Conectar Mercado Pago** por OAuth en Config. La conexión manual con tokens es avanzada y solo se recomienda si lo indica soporte. El asistente no debe pedir ni reproducir tokens.

## Conectar la cuenta del negocio

1. Entrá al tenant con un usuario que tenga permiso para conectar Mercado Pago.
2. Abrí **Config → Mercado Pago → Conectar Mercado Pago**.
3. Iniciá sesión en Mercado Pago con la cuenta del negocio que recibirá los pagos y autorizá a Faciliter.
4. De vuelta en Config, verificá **Conectada con Mercado Pago** y elegí **Probar**.
5. Si la cuenta se revocó o necesita reconexión, usá **Reconectar Mercado Pago** con la cuenta correcta.

El tenant no crea una app en Mercado Pago Developers ni configura webhooks para la conexión OAuth normal. El token se administra de forma segura por Faciliter. Si OAuth no está habilitado en el servidor, contactá soporte; no compartas Access Token o Public Key.

## Preparar Point QR

Con la cuenta conectada, Config permite crear una sucursal y una caja QR en Mercado Pago. Se necesitan calle, altura, ciudad, provincia, latitud y longitud reales y precisas. Mercado Pago usa la ubicación para cálculos impositivos. Revisá antes de confirmar: la dirección creada no se puede editar desde Faciliter. Si se creó la sucursal pero falló la caja, el reintento reutiliza la sucursal guardada.

Después, en Caja elegí **Mercado Pago Point (QR en caja)**. El QR dinámico se escanea con Mercado Pago y Caja valida el estado con Mercado Pago antes de emitir comprobante. No es el link de pago para clientes a distancia.

Descuentos iniciales: Point QR **5 %**, link MP **0 %**. Son configurables por tenant en Config y se pueden ajustar por venta en Caja; los descuentos de efectivo/transferencia se configuran aparte.

Guía pública detallada: `/docs/config`.
