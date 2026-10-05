# Configurar Mercado Pago (gyms y clubes)

Cuando pregunten cómo conectar o configurar MP: explicá primero la **forma normal** (botón «Conectar Mercado Pago»), qué hace Faciliter solo, renovación y errores. La conexión manual es avanzada: mencionala solo si preguntan o si el botón no aparece. El asistente **explica**; no pega tokens ni llama a MP.

**Para quién:** dueño o staff con permiso `mp.connect` en **su** tenant (no el de plataforma).  
**Plataforma (`admin`):** ya tiene un ejemplo; ver el anexo al final.

Faciliter cobra **en la cuenta Mercado Pago del local**. Pantalla: **Config** (`/dashboard/config`). Débito MONTHLY: topic `debito`.

## 1. Forma normal: «Conectar Mercado Pago»

El gym **no** crea aplicación en MP Developers, no copia tokens y no configura webhooks.

1. Panel del local (`{slug}.faciliter.xyz`) con un usuario con `mp.connect`.
2. **Config** → **Mercado Pago** → **Conectar Mercado Pago**.
3. En Mercado Pago: iniciar sesión con la cuenta **del gym** (la que cobra) → **Autorizar**.
4. Vuelve solo a Config: «Cuenta de Mercado Pago conectada». Estado: **Conectada con Mercado Pago**.
5. **Probar**: devuelve el usuario MP (`mpUserId`).

Si cancela en MP o tarda más de 10 minutos, Config avisa y hay que tocar el botón otra vez.

**Qué hace Faciliter solo:**

- Guarda cifrados el token y el código de renovación.
- El token dura 180 días; Faciliter lo **renueva solo** cuando faltan menos de 30. Si MP no deja renovar (se quitó el permiso), Config muestra **Reconectar Mercado Pago**.
- Cada link de cobro y de débito lleva `notification_url` con el `tenantId` del local: MP avisa pagos y suscripciones sin configurar webhooks.

**Cambiar de cuenta MP:** **Reconectar Mercado Pago** con la otra cuenta.  
**Desconectar:** en Config corta los cobros. Para quitar el permiso también en MP: cuenta MP del gym → aplicaciones conectadas.

## 2. Conexión manual (avanzado)

Escondida en Config (**Conexión manual (avanzado)**). Solo si lo pide soporte o si el servidor no tiene la app de plataforma (el botón no aparece y el bloque manual se ve abierto).

1. Con la cuenta del gym: app propia en [developers.mercadopago.com](https://www.mercadopago.com/developers) con producto **Checkout Pro** (las suscripciones no se activan aparte; se crean por API con el mismo token).
2. Access Token + Public Key de **producción** → **Guardar token manual** (valida `GET /users/me`).
3. No se renueva solo: si se regenera en MP, hay que pegarlo de nuevo.
4. Webhooks opcionales en esa app: `https://api.faciliter.xyz/api/webhooks/payment?tenantId={UUID_DEL_TENANT}` con `payment`, `topic_merchant_order_wh`, `subscription_preapproval`, `subscription_authorized_payment`. El UUID es el id interno del gym (no el App ID ni el slug).

## 3. Comisión y cuándo está disponible la plata

Mercado Pago cobra una **comisión por cada cobro**, y el porcentaje depende de **cuándo** quiere el gym tener la plata disponible. Faciliter no cobra nada sobre las ventas del gym.

Tarifas oficiales de Checkout (Argentina, consultadas en octubre de 2026; **+ IVA**, y pueden variar según la provincia y el medio de pago):

| Plata disponible | Comisión |
|------------------|----------|
| Al instante | 6,29% + IVA |
| En 10 días | 4,39% + IVA |
| En 18 días | 3,39% + IVA |
| En 35 días | 1,49% + IVA |

Con el IVA (21 %), **al instante queda en ≈ 7,6 % final** del cobro. Las cuotas sin interés tienen un costo aparte para el vendedor.

**Si el gym necesita la plata en el momento**, tiene que configurar el plazo **al instante** en su cuenta de Mercado Pago (no en Faciliter): **Tu negocio → Costos y cuotas**, en la configuración de cobros con Checkout. Si no, MP puede dejar el cobro aprobado pero «pendiente de liberación» hasta la fecha del plazo elegido. Desde Faciliter, **Estado en Mercado Pago** (Cierre, Reportes o comprobante) muestra la fecha de liberación de cada cobro.

Links oficiales para pasarle al usuario:

- Configurar costos y plazo en su cuenta (pide iniciar sesión en MP): https://www.mercadopago.com.ar/costs-section
- Ayuda de MP «Costos, plazos de acreditación y cuotas»: https://www.mercadopago.com.ar/ayuda/19032
- Tarifas de Checkout: https://www.mercadopago.com.ar/herramientas-para-vender/check-out

Los porcentajes cambian: ante la duda, que el usuario los confirme en esos links.

En Caja, efectivo y transferencia llevan un **descuento por defecto de 7,6 %** (la comisión al instante con IVA), configurable en **Config → Operación**. Si el gym eligió otro plazo en MP (por ejemplo, 35 días), puede bajar ese % para que coincida. Detalle: topic `caja`.

## 4. Errores típicos

- «La conexión con un toque no está habilitada»: el servidor no tiene configurada la app de plataforma (lo resuelve Faciliter).
- «Mercado Pago no aceptó la conexión»: problema de configuración del servidor (URL de redireccionamiento o PKCE). Escribir a soporte.
- Autorizó con la cuenta equivocada: **Reconectar** con la del gym.
- Aparece «Reconectar»: se quitó el permiso desde MP o el token venció. Reconectar.
- Manual: token de **test** en un gym live, o webhook con el UUID de **admin** / de otro local.
- «Faciliter dice aprobado pero no lo veo en la app de MP»: en Cierre, Reportes o el comprobante, **Estado en Mercado Pago** consulta el pago en MP y muestra comisiones, cuánto queda, cuándo se libera la plata y si lo cobró la cuenta conectada. Aprobado no siempre es disponible: MP libera según los plazos de la cuenta. Si dice «Otra cuenta de Mercado Pago», se conectó otra cuenta: **Reconectar** con la del gym.

## Anexo: tenant plataforma (`admin`)

Esto **no** lo copia un gym. Conexión manual de Faciliter Admin (app **facilitermp**, App ID `8990673938056290`), 2026-09-29.

| Campo | Valor |
|--------|--------|
| URL producción | `https://api.faciliter.xyz/api/webhooks/payment?tenantId=00000000-0000-4000-8000-000000000002` |
| `tenantId` | `00000000-0000-4000-8000-000000000002` (seed de `admin`). |
| Topics | `payment`, `topic_merchant_order_wh`, `subscription_preapproval`, `subscription_authorized_payment` |

La app de «Conectar Mercado Pago» es **otra** app de Faciliter, sin webhooks de panel (detalle para operadores en `docs/uso/configurar-mercadopago-tenant.md`).
