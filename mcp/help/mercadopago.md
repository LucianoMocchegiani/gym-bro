# Mercado Pago del local

Cada gym o club cobra **en su cuenta Mercado Pago**. Faciliter no es el cobrador: guarda el token cifrado y recibe avisos (webhooks). El asistente **explica**; no pega credenciales ni llama a MP. Detalle para humanos: `docs/uso/configurar-mercadopago-tenant.md`.

Hace falta permiso `mp.connect` para Config. El `tenantId` de la URL lo da la **plataforma** (ficha del tenant), no el App ID de MP ni el slug.

## Tres piezas

1. **Aplicación** en [developers.mercadopago.com](https://www.mercadopago.com/developers) (cuenta que cobra).
2. **Credenciales** en Faciliter → **Config**: access token y public key de **producción**. Guardar y **Probar** (`/users/me`).
3. **Webhooks** en esa misma app:

```text
https://api.faciliter.xyz/api/webhooks/payment?tenantId={UUID_DEL_TENANT}
```

HTTPS. El UUID es **de ese local**. Producción y sandbox pueden ser la misma URL si solo hay un API público.

**Topics:** `payment` (pagos), `topic_merchant_order_wh` (órdenes comerciales), `subscription_preapproval` (autorizó o canceló el débito), `subscription_authorized_payment` (MP cobró un mes). En el panel: Pagos, Órdenes comerciales, Planes y suscripciones.

Productos de la app: **Checkout Pro** + **Suscripciones** (débito MONTHLY sin guardar tarjeta en Faciliter).

El secret de firma de webhooks **no** se pega en Config.

Faciliter también manda `notification_url` en cada link; igual hay que cargar el webhook de la app.

## No hacer

- URL sin `tenantId` o con el UUID de **otro** local / de plataforma (`admin`).
- Una sola app MP para todos los gyms (un webhook de panel = un tenant).
- Token de prueba en live.

Pantalla: **Config** (`/config`). Débito en Caja: topic `debito`.
