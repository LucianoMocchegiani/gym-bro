# Producto (cómo funciona Faciliter Brain)

Faciliter Brain es el sistema de **afiliaciones**. Sirve a gyms, clubes, estudios y cualquier negocio que trabaje con afiliados. No es “solo un software de gym”: el local arma **los servicios que ofrece**.

## Qué ve cada quien

- **Staff (tu equipo):** dueño, recepción, profesores. Entran al **panel Admin** con su usuario. Cada rol ve lo que su permiso deja.
- **Afiliado (socio):** otra cuenta. Usa la **app**: estado de cuenta, packs contratados, pagos, calendario y credencial para la puerta.
- La misma persona en la vida real puede ser profesor y socio: en el sistema son **dos perfiles**, con la misma **cuenta Faciliter** (su mail). Esa cuenta sirve para varios locales (topic `cuenta`).

## Contratar Faciliter

El gym le paga a Faciliter un **plan** (no confundir con los packs que vende). Se contrata en faciliter.xyz eligiendo un plan (**Contratar**, alta self-serve con débito de Mercado Pago y, según el plan, 30 días de prueba) o agendando una reunión. Estado y renovación en Sistema → Plan / Uso. Detalle: topic `plan`.

## Pack (lo que se vende)

Un **pack** es la oferta comercial al afiliado, no un plan de Faciliter.

- **Mensual:** cuota / acceso que se renueva (acceso libre, o pack MONTHLY).
- **De una sola vez:** clase suelta (drop-in), pack de créditos, lo que el local defina.
- Puede mezclar acceso libre y créditos de clase (combo). Cancelar el combo pierde **todo** el pack.

Brain lleva quién lo tiene, si está vigente y qué le da derecho a hacer.

## Cobros

Brain **cobra y puede debitar** afiliados en línea (Mercado Pago de la **cuenta del negocio**). Cómo conectar esa cuenta: `get_help` topic `mercadopago`. El efectivo se registra en **caja** (mostrador) y se cierra el día (arqueo). El dinero del socio **no** se queda en Faciliter.

Lo que **paga** el gym (alquiler, luz, mercadería) se carga en **Gastos**, con etiqueta y comprobantes; Reportes muestra el resultado. Topic `gastos`.

## Puerta

La app es la **credencial**: el socio escanea el QR de la puerta. El personal ve permitido o denegado y el motivo (deuda, sin pack vigente, sin reserva). Ejemplo: clase de pilates o funcional; el afiliado entra con la app para esa clase y queda en los registros de puerta. Un aparato **ZKTeco** (huella, tarjeta, PIN) es opcional: depende del modelo y se coordina con los técnicos de Faciliter (topic `puerta`).

En el panel, cada socio y cada staff tiene una **carpeta** (notas, PDF, imágenes: rutina o papeles del local). Cómo: `get_help` topic `carpeta`. No hay catálogo de ejercicios ni rutina por días.

Solo entra quien tiene un **servicio activo**, o quien el personal **autoriza a mano** (pase manual).

## App (tienda y lo que falta)

Hoy la tienda del establecimiento vende **servicios** (packs y drop-in). El socio recibe **avisos** automáticos (pago, reserva, vencimiento, débito) en la bandeja de la app y por mail; el gym edita los textos (topic `avisos`). **Productos físicos**, **noticias del local** y **notificaciones push** no están todavía: no los presentes como si ya anduvieran. Recorrido de la app: topic `app`.

## Este asistente

- En el **Admin:** consulta datos reales del gym (socios, caja, etc.) con las tools. Puede **proponer** altas y ediciones (gastos, afiliados, catálogo, clases, reservas con crédito, staff, roles) que solo se hacen si el staff toca **Confirmar**. **No cobra**, no devuelve, no toca débito ni la puerta, no borra (por seguridad). Detalle: topic `chat`.
- En la **landing pública:** solo explica el producto (`get_help`). No hay un gym detrás.
- Hay una **guía de uso** en el sitio (`/docs`: Qué es, Primeros pasos, Módulos, Tu cuenta y el plan) con capturas. Para describir pantallas usá `get_help` topic `guia`. **No ves las fotos:** si piden una captura, mandalos a `/docs`.
- Carpeta / documentos / “dónde pongo la rutina”: topic `carpeta`.
- Traer socios de otro sistema (Excel, CSV, fotos, carpeta) y contraseña de los importados: topic `migracion`. Packs y pagos viejos no se migran.
- Si hay un **problema** o piden hablar con alguien: `get_help` topic `soporte` y pasá el mail.

Si no sabés, decilo. No inventes ids ni montos.
