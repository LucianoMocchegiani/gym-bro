# Config del tenant

Usá esta sección si tenés permiso para editar la configuración del tenant. La pantalla está en **Sistema → Config** (`/dashboard/config`). La conexión de Mercado Pago y la preparación de Point crean o modifican recursos de la cuenta de Mercado Pago conectada; confirmá los datos antes de continuar.

## Configuración operativa

En **Operación** podés elegir el sistema de acceso: **QR con Kuatia Wallet** o **Acceso ZKTeco**. Con Kuatia, la pantalla de Puerta genera un QR que se escanea con la cámara del teléfono y abre Kuatia Wallet web; también se puede copiar y enviar el link. Con ZKTeco se muestra el identificador ya vinculado o el DNI de respaldo; Faciliter no da de alta un número nuevo en el dispositivo.

La misma pantalla configura horas para cancelar reservas, lista de espera, ingreso tardío a clase, tolerancia de deuda y multi-ingreso con tope diario. Guardá con **Guardar operación**. Si cambiás la modalidad de acceso, confirmá que los equipos y el procedimiento del local correspondan a la opción elegida.

También se configuran los descuentos predeterminados de Caja para efectivo y transferencia. Esos valores no son los descuentos de Mercado Pago.

## Conectar Mercado Pago por OAuth

La forma normal conecta la cuenta del negocio usando **OAuth**. No hay que crear una aplicación en Mercado Pago Developers ni copiar tokens.

1. En Config, bloque **Mercado Pago**, elegí **Conectar Mercado Pago**.
2. Iniciá sesión en Mercado Pago con la cuenta del negocio que recibirá los cobros y autorizá a Faciliter.
3. Volvés a Config; verificá que aparezca **Conectada con Mercado Pago**. Usá **Probar** para validar la conexión.
4. Si se revocó el permiso o aparece que la conexión necesita atención, elegí **Reconectar Mercado Pago** con la cuenta correcta.

Esta cuenta se usa para links de pago y para crear la sucursal/caja de Point QR. La conexión manual con Access Token y Public Key es avanzada: usala solo si lo indica soporte. No compartas credenciales ni tokens.

Si el botón OAuth no está disponible en el servidor, la pantalla lo informa; contactá soporte en lugar de crear una aplicación propia sin indicación.

## Preparar Mercado Pago Point QR

Point QR de Caja es distinto del link de pago. Primero conectá Mercado Pago por OAuth. Luego, en el mismo bloque, completá **QR dinámico en Caja**:

1. Ingresá la dirección real del local: nombre de calle, altura, ciudad y provincia.
2. Agregá latitud y longitud precisas de esa sucursal. Mercado Pago las usa para cálculos impositivos.
3. Revisá los datos y tocá **Crear sucursal y caja QR**; confirmá la acción.
4. Cuando Config muestre **Sucursal y caja QR configuradas**, Point queda disponible para cobrar en Caja.

La operación crea una sucursal y una caja (POS) en la cuenta conectada de Mercado Pago. Faciliter no permite editar esa ubicación después de crearla. Si la creación falla después de crear la sucursal, el reintento reutiliza la sucursal guardada y crea la caja faltante. Si conectás otra cuenta de Mercado Pago, habrá que configurar su sucursal y caja.

Los descuentos de Mercado Pago se muestran en **Descuentos predeterminados en Caja**: Point QR empieza en **5 %** y el link MP en **0 %**. Podés cambiarlos y guardarlos; Caja permite ajustar el descuento de cada venta. Esto es independiente de los descuentos de efectivo/transferencia.

## Cobrar con Point QR en Caja

En **Caja → Cobro**, elegí afiliado y productos; después seleccioná **Mercado Pago Point (QR en caja)** y **Generar QR Point**. El afiliado escanea el QR dinámico con Mercado Pago. Dejá Caja abierta: consulta el estado del pago y solo emite el comprobante cuando Mercado Pago confirma el monto acreditado. Si cancelás o limpiás la pantalla, no significa que el pago se haya anulado en Mercado Pago; verificá el estado antes de repetir el cobro.

Point QR está disponible para cobros desde Caja; no es el checkout del portal del afiliado. Para pagos a distancia usá el link de Mercado Pago.

**Captura:** `web-config.png` — rehacer.  
**Dónde:** Sistema → Config, cuenta Mercado Pago conectada, sucursal/caja QR configuradas y descuentos visibles.  
**Por qué rehacer:** la captura existente no muestra la configuración actual de Point QR.  
**Qué se ve:** estado OAuth conectado, estado de la sucursal/caja y descuentos QR/link.

**Captura:** `web-caja-point-qr.png` — falta.  
**Dónde:** Caja, cobro de prueba en espera de pago con QR Point generado.  
**Qué se ve:** el QR dinámico y el medio seleccionado; usar datos de prueba y no mostrar información personal.
