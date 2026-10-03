# Configurar Mercado Pago (gyms y clubes)

Cuando pregunten cómo conectar o configurar MP: explicá primero la **forma normal** (botón «Conectar Mercado Pago»), qué hace Faciliter solo, renovación y errores. La conexión manual es avanzada: mencionala solo si preguntan o si el botón no aparece. El asistente **explica**; no pega tokens ni llama a MP.

**Para quién:** dueño o staff con permiso `mp.connect` en **su** tenant (no el de plataforma).  
**Plataforma (`admin`):** ya tiene un ejemplo; ver el anexo al final.

Faciliter cobra **en la cuenta Mercado Pago del local**. Pantalla: **Config** (`/config`). Débito MONTHLY: topic `debito`.

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

## 3. Errores típicos

- «La conexión con un toque no está habilitada»: el servidor no tiene configurada la app de plataforma (lo resuelve Faciliter).
- «Mercado Pago no aceptó la conexión»: problema de configuración del servidor (URL de redireccionamiento o PKCE). Escribir a soporte.
- Autorizó con la cuenta equivocada: **Reconectar** con la del gym.
- Aparece «Reconectar»: se quitó el permiso desde MP o el token venció. Reconectar.
- Manual: token de **test** en un gym live, o webhook con el UUID de **admin** / de otro local.

## Anexo: tenant plataforma (`admin`)

Esto **no** lo copia un gym. Conexión manual de Faciliter Admin (app **facilitermp**, App ID `8990673938056290`), 2026-09-29.

| Campo | Valor |
|--------|--------|
| URL producción | `https://api.faciliter.xyz/api/webhooks/payment?tenantId=00000000-0000-4000-8000-000000000002` |
| `tenantId` | `00000000-0000-4000-8000-000000000002` (seed de `admin`). |
| Topics | `payment`, `topic_merchant_order_wh`, `subscription_preapproval`, `subscription_authorized_payment` |

La app de «Conectar Mercado Pago» es **otra** app de Faciliter, sin webhooks de panel (detalle para operadores en `docs/uso/configurar-mercadopago-tenant.md`).
