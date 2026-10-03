# Configurar Mercado Pago (gyms y clubes)

**Para quién:** dueño o staff con permiso de conectar MP (`mp.connect`) en **su** tenant (no el de plataforma).  
**Plataforma (`admin`):** ya tiene un ejemplo cargado; ver al final qué se registró.

Faciliter cobra **en la cuenta Mercado Pago del local**. La plata va directo a esa cuenta; Faciliter no la toca.

---

## 1. Forma normal: «Conectar Mercado Pago»

El gym **no** crea ninguna aplicación en MP Developers, no copia tokens y no configura webhooks.

1. Entrá al panel del local (`{slug}.faciliter.xyz`) con un usuario que tenga `mp.connect`.
2. **Config** → bloque **Mercado Pago** → **Conectar Mercado Pago**.
3. Se abre Mercado Pago: iniciá sesión con la cuenta **del gym** (la que cobra) y tocá **Autorizar**.
4. Volvés solo a Config con «Cuenta de Mercado Pago conectada». El estado dice **Conectada con Mercado Pago**.
5. **Probar**: tiene que devolver un usuario MP (`mpUserId`).

Si cancelás en MP o tardás más de 10 minutos, Config avisa y hay que tocar el botón otra vez.

**Qué hace Faciliter solo:**

- Guarda cifrados el token y el código de renovación que entrega MP.
- El token dura 180 días. Faciliter lo **renueva solo** cuando faltan menos de 30. Si MP no lo deja renovar (por ejemplo, porque quitaste el permiso desde tu cuenta MP), Config muestra **Reconectar Mercado Pago**.
- En cada link de cobro y de débito manda `notification_url` con el `tenantId` del local. Así MP avisa los pagos y las suscripciones sin que el gym configure nada.

**Cambiar de cuenta MP:** **Reconectar Mercado Pago** e iniciá sesión con la otra cuenta.

**Desconectar:** en Config corta los cobros en Faciliter. Para quitarle el permiso a Faciliter también del lado de MP: desde la cuenta MP del gym, en las aplicaciones conectadas (suele estar en **Seguridad**).

---

## 2. Conexión manual (avanzado)

Queda escondida en Config (**Conexión manual (avanzado)**) como respaldo mientras se prueba la conexión normal. Se usa solo si lo pide soporte, o si el servidor no tiene configurada la app de plataforma (el botón no aparece y el bloque manual se ve abierto).

1. Con la cuenta del gym, en [developers.mercadopago.com](https://www.mercadopago.com/developers), creá una aplicación propia con producto **Checkout Pro** (las suscripciones no se activan aparte: se crean por API con el mismo token).
2. Copiá **Access Token** y **Public Key** de **producción** y pegalos en Config → **Conexión manual (avanzado)** → **Guardar token manual**. Faciliter valida con `GET /users/me`.
3. Este token **no** se renueva solo. Si lo regenerás en MP, hay que pegarlo de nuevo.
4. Webhooks (opcional; Faciliter ya manda `notification_url`): en la app → **Webhooks**, URL `https://api.faciliter.xyz/api/webhooks/payment?tenantId={UUID_DEL_TENANT}`, con los topics `payment`, `topic_merchant_order_wh`, `subscription_preapproval` y `subscription_authorized_payment`.
   - `{UUID_DEL_TENANT}` es el id interno del gym en Faciliter (**no** el App ID de MP, **no** el slug).

---

## 3. Para el operador de Faciliter (una sola vez por servidor)

El botón necesita una **aplicación de plataforma** de Faciliter en MP Developers. Los gyms la autorizan; no la ven.

1. Con la cuenta MP de Faciliter, creá una aplicación **aparte** con nombre y logo de Faciliter (es lo que ve el gym al autorizar) y producto **Checkout Pro**. MP deja elegir un solo producto; las suscripciones no se activan aparte, se crean por API con el token del gym.
   - Permisos: todos los que ofrezca, sobre todo acceso sin conexión (`offline_access`): sin eso MP no entrega el refresh token.
   - **No** le configures webhooks en el panel. Los avisos llegan por la `notification_url` de cada cobro. Un webhook de panel con el `tenantId` de `admin` recibiría también los pagos de los gyms, y fallarían con reintentos.
   - No reutilices la app de cobros de plataforma (`facilitermp`) por ese motivo.
2. En la app → **Editar**:
   - **URL de redireccionamiento:** `https://api.faciliter.xyz/api/mercadopago/oauth/callback` (exacta; es `{PUBLIC_API_BASE_URL}/api/mercadopago/oauth/callback`).
   - Habilitá **flujo de código de autorización con PKCE** (recomendado).
3. En `api/.env` del servidor:
   - `MP_OAUTH_CLIENT_ID` y `MP_OAUTH_CLIENT_SECRET`: credenciales de producción de esa app.
   - `MP_OAUTH_PKCE=false` solo si **no** habilitaste PKCE.
   - `MP_OAUTH_REDIRECT_URI` solo si la URL registrada no es la de por defecto.
   - `PUBLIC_WEB_BASE_URL` tiene que ser el apex web (`https://faciliter.xyz`): la vuelta va a `{slug}.<ese host>/config`.
4. Reiniciá el API. Sin client id o secret, Config solo ofrece la conexión manual.

---

## 4. Checklist

- [ ] Config → **Conectar Mercado Pago** → autorizar con la cuenta **del gym**.
- [ ] Estado «Conectada con Mercado Pago»; **Probar** OK.
- [ ] Probar un cobro MP en Caja y, si aplica, un débito MONTHLY ([probar-debito-suscripcion-mp.md](./probar-debito-suscripcion-mp.md)).

---

## 5. Errores típicos

- **«La conexión con un toque no está habilitada»:** el servidor no tiene `MP_OAUTH_CLIENT_ID` / `MP_OAUTH_CLIENT_SECRET`.
- **«Mercado Pago no aceptó la conexión»:** la URL de redireccionamiento de la app no coincide exacto con la del API, o PKCE está habilitado en la app y `MP_OAUTH_PKCE=false` (o al revés).
- **Autorizaste con la cuenta equivocada** (la personal en vez de la del gym): **Reconectar Mercado Pago** con la cuenta correcta.
- **Aparece «Reconectar»:** se quitó el permiso desde MP o el token venció sin poder renovarse. Reconectar.
- **Manual:** token de **test** en un gym live, o webhook con el UUID de **admin** / de otro local.

---

## Anexo: qué se cargó para el tenant **plataforma** (`admin`)

Esto **no** lo copia un gym. Es la conexión manual de Faciliter Admin (app **facilitermp**, App ID `8990673938056290`), registrada el 2026-09-29.

| Campo | Valor |
|--------|--------|
| URL producción | `https://api.faciliter.xyz/api/webhooks/payment?tenantId=00000000-0000-4000-8000-000000000002` |
| URL sandbox | La misma (solo hay un API público). |
| `tenantId` | `00000000-0000-4000-8000-000000000002` (seed de `admin`; si la VPS usó otro id, hay que alinearlo). |
| Topics | `payment`, `topic_merchant_order_wh`, `subscription_preapproval`, `subscription_authorized_payment` |

Sirve para cobros y suscripciones **de plataforma** (planes Faciliter, Caja `admin`).
