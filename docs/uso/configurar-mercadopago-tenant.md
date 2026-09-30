# Configurar Mercado Pago (gyms y clubes)

**Para quién:** dueño o staff con permiso de conectar MP (`mp.connect`) en **su** tenant (no el de plataforma).  
**Plataforma (`admin`):** ya tiene un ejemplo cargado; ver al final qué se registró.

Faciliter cobra **en la cuenta Mercado Pago del local**. Cada gym/club usa **su propia aplicación** de Developers y **su** `tenantId` en la URL de webhook.

---

## Tres piezas (no mezclarlas)

| Pieza | Dónde | Qué es |
|--------|--------|--------|
| **Aplicación** | [developers.mercadopago.com](https://www.mercadopago.com/developers) | App del local (nombre, Client ID). Ahí se activan productos y webhooks **de esa app**. |
| **Credenciales** | Faciliter → **Config** | `access_token` (producción) + `public_key`. Faciliter las guarda cifradas y prueba `GET /users/me`. |
| **Webhooks** | Misma app en Developers → Webhooks | MP avisa a Faciliter cuando hay un pago o un ciclo de suscripción. **Una URL por app**, con el UUID **de ese tenant**. |

El token de Config tiene que ser el de **esa misma** aplicación (producción).

---

## 1. Crear la aplicación en Mercado Pago

1. Entrá a Developers con la cuenta **del gym/club** (la que cobra).
2. Creá una aplicación (nombre libre, p. ej. el del local).
3. Productos a habilitar:
   - **Checkout Pro** (links de Caja / packs / drop-in).
   - **Suscripciones** (débito MONTHLY: plan + preapproval, sin guardar tarjeta en Faciliter).
4. Copiá:
   - **Public Key** (producción)
   - **Access Token** (producción)

No uses credenciales de prueba en el gym live.

---

## 2. Pegar token y key en Faciliter

1. Entrá al panel del local (`{slug}.faciliter.xyz`) con un usuario que tenga `mp.connect`.
2. **Config** → cuenta Mercado Pago.
3. Pegá access token y public key → guardar.
4. **Probar**: tiene que devolver un usuario MP (`mpUserId`). Si falla, el token no es de esa cuenta o está cortado.

---

## 3. Webhooks en Developers (esto es lo que hay que copiar)

En la app → **Webhooks** (o Notificaciones):

**URL de producción (y, si te pide, la de prueba/sandbox):**

```text
https://api.faciliter.xyz/api/webhooks/payment?tenantId={UUID_DEL_TENANT}
```

- `{UUID_DEL_TENANT}` es el id interno del gym en Faciliter (**no** el App ID de MP, **no** el slug).
- Lo entrega la plataforma al dar de alta el local, o un Super Admin en la ficha del tenant. Si usás el UUID de **otro** gym, los cobros se acreditan mal o no entran.
- HTTPS obligatorio. No uses `localhost`.

**Eventos / topics a tildar** (los mismos que usa Faciliter):

| Topic (nombre técnico) | Para qué |
|------------------------|----------|
| `payment` | Pagos (Checkout Pro y, a veces, el cobro de un ciclo). |
| `topic_merchant_order_wh` | Órdenes comerciales (carrito MP). |
| `subscription_preapproval` | El socio autorizó / canceló / pausó la suscripción (débito). |
| `subscription_authorized_payment` | MP cobró un mes de la suscripción. |

En el panel a veces se ven como **Pagos**, **Órdenes comerciales** y **Planes y suscripciones** (preapproval + authorized payment). Tildá los cuatro equivalentes.

MP genera un **secret** para firmar notificaciones. Faciliter **hoy no lo pide** en Config; no hace falta pegarlo. Guardalo en el panel por si más adelante validamos firma.

---

## 4. Qué hace Faciliter solo (no lo cargás a mano)

En cada link de checkout o de débito, la API manda también `notification_url` con **el mismo patrón** y el `tenantId` de **ese** local. Eso refuerza el aviso aunque el panel falle. **Igual hay que cargar el webhook de la app**: las suscripciones dependen de esos topics.

---

## 5. Checklist

- [ ] App propia del local (no reutilizar la de otro gym).
- [ ] Checkout Pro + Suscripciones.
- [ ] Token + public key de **producción** en Config; test OK.
- [ ] Webhook HTTPS con **su** `tenantId`.
- [ ] Topics: payment, merchant order, subscription_preapproval, subscription_authorized_payment.
- [ ] Probar: un cobro MP en Caja y, si aplica, un débito MONTHLY ([probar-debito-suscripcion-mp.md](./probar-debito-suscripcion-mp.md)).

---

## 6. Errores típicos

- URL sin `tenantId` o con el UUID de **admin** / de otro local.
- Token de **test** en un gym live (o al revés).
- Una sola app MP para todos los gyms: el webhook del panel solo puede llevar **un** `tenantId`. Cada local = una app (o al menos un webhook distinto).
- Falta producto Suscripciones: el link de débito no se crea.
- Webhook a un host que no es `api.faciliter.xyz` (o el API público que use esa instalación).

---

## Anexo: qué se cargó para el tenant **plataforma** (`admin`)

Esto **no** lo copia un gym. Es el ejemplo de Faciliter Admin (app **facilitermp**, App ID `8990673938056290`), registrado el 2026-09-29.

| Campo | Valor |
|--------|--------|
| URL producción | `https://api.faciliter.xyz/api/webhooks/payment?tenantId=00000000-0000-4000-8000-000000000002` |
| URL sandbox | La misma (solo hay un API público). |
| `tenantId` | `00000000-0000-4000-8000-000000000002` (seed de `admin`; si la VPS usó otro id, hay que alinearlo). |
| Topics | `payment`, `topic_merchant_order_wh`, `subscription_preapproval`, `subscription_authorized_payment` |

Sirve para cobros y suscripciones **de plataforma** (planes Faciliter, Caja `admin`). Un gym debe repetir el mismo **formato** con **su** UUID y **su** aplicación.
