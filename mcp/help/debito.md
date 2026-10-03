# Débito automático

**Débito** = Mercado Pago cobra solo cada mes un pack **mensual** (MONTHLY) con una **suscripción** (preapproval sin plan) en la cuenta **del gym**. Cada suscripción guarda el precio del pack de su alta; si cambia el precio, aplica al **Regenerar link** o con **Próximo pack**. Faciliter no guarda la tarjeta ni dispara el cobro: cuando MP avisa que un mes se aprobó, se registra el cobro y el contrato.

**Alta:** en Caja → Cobro, con un pack mensual y Mercado Pago, tildar débito automático. Se genera un **link** de checkout MP; el socio autoriza en Mercado Pago (no hay formulario de tarjeta en Faciliter).

**Pestaña Débitos** (Caja): cola **Pendiente / link**, **Reintentando**, **Fallidos**, **Todos**. Al elegir un socio: estado, próximo cobro y monto. Acciones: **Abrir checkout MP**, **Copiar link** (para mandárselo), **Próximo pack**, **Regenerar link**, **Dar de baja**. MP reintenta si un cobro falla. Dar de baja corta los cobros que vienen; el mes ya pago sigue vigente. La ficha del socio ataja a `/caja?memberId=&vista=debitos`.

Si el débito falla, al socio le llegan los avisos de débito (topic `avisos`) y el pack aparece en **Vencimientos**.

El asistente **lista** mandatos. **No enrola ni cancela.** Hace falta permiso de caja y MP conectado en Config (topic `mercadopago`).
