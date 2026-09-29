# Comprobar débito MONTHLY (suscripción Mercado Pago)

**Dónde:** VPS / live. No alcanza un typecheck local.  
**Reglas:** RN-PAG-013..016 · CU-PAG-008..010. Checklist corto: `docs/08-casos-prueba-manuales.md` (P9…P9j).

Faciliter **no guarda la tarjeta**. El cobro lo dispara Mercado Pago (plan + preapproval). Caja solo genera el `init_point`.

## Antes

1. Deploy del API con `npx prisma migrate deploy` (migración `20260929220000_debit_mp_preapproval`).
2. Staff con permiso `cashier.operate`.
3. Cuenta MP del **gym** conectada en Config.
4. En la app MP del gym: producto **Suscripciones** y webhooks hacia  
   `{PUBLIC_API_BASE_URL}/api/webhooks/payment?tenantId={uuid-del-gym}`  
   topics: `payment`, `subscription_preapproval`, `subscription_authorized_payment`.
5. Pack MONTHLY activo con precio ≥ 1.

Los mandatos que existían con **tarjeta + job** quedan `CANCELLED` al migrar. Hay que generar un **link nuevo**.

## Flujos

### 1. Alta con cobro al autorizar

1. Caja → afiliado → un pack MONTHLY en el carrito → medio Mercado Pago → tilde débito.
2. **Generar link de débito** (no es Preference de carrito ni Brick).
3. Copiar / abrir el link. El socio autoriza en Mercado Pago.
4. **OK:** mandato `ACTIVE`; contrato del primer ciclo; movimiento/comprobante por webhook.  
   **Error:** link vacío → token MP / Suscripciones; webhook sin contrato → URL pública y topics.

### 2. Alta sin cobro ahora

1. Afiliado con MONTHLY **vigente**.
2. `/caja?memberId={id}&vista=debitos` → generar link (primer cobro en el vencimiento).
3. **OK:** `PENDING_CHECKOUT` hasta autorizar; al autorizar, `ACTIVE` sin contrato nuevo hasta el ciclo de MP.

### 3. Baja

En Débitos → dar de baja. **OK:** preapproval cancelado en MP; el mes ya pagado sigue hasta `endsAt`.

### 4. Cambio de pack

Guardar pack B. **OK:** nuevo `init_point`; el socio autoriza de nuevo; A se deja vencer (sin prorrateo).

## No probar

- Card Payment Brick / tokenizar en Faciliter.
- `POST /debit-mandates/:id/charge` (ya no existe).
- Cron de cobro.
- Caja de plataforma (`admin`): el débito es por afiliado del gym.

## Si falla el webhook

Revisar `PUBLIC_API_BASE_URL`, `tenantId` del query, access token del gym y que el `external_reference` del preapproval sea el UUID del mandato (no un signup de plataforma).
