# Tienda: Mercado Pago (checkout propio) vs Mercado Libre / marketplaces

**Fecha:** 2026-07-13  
**Fuente:** [Charla ChatGPT (compartida)](https://chatgpt.com/share/6a555a84-5c08-83e9-b02f-cc43a3e150b4)  
**Estado:** revisada  
**Tema:** tienda / e-commerce / pagos  
**Relacionado:** backlog — Tienda / e-commerce (post-MVP)

---

## Lo bueno (resumen)

### 1. OAuth multi-tenant en marketplaces (ej. Mercado Libre)

No es “una cuenta ML por tenant en el sentido de app distinta”. El estándar es:

```text
GymBro (SaaS)
 └── Una sola App en ML
      ├── client_id
      └── client_secret

Gym A → access_token A (+ refresh)
Gym B → access_token B
Gym C → access_token C
```

- Registrás **una** aplicación en el marketplace.
- Cada gimnasio **autoriza** esa app (OAuth).
- ML identifica al vendedor por el **token**, no por “tenant”.
- En DB por tenant: `mercadolibre_user_id`, `access_token`, `refresh_token`, `expires_at`.

### 2. Otras plataformas con el mismo patrón

| Plataforma | Notas |
|------------|--------|
| Shopify | App instalada por tienda → token |
| Tiendanube (Nuvemshop) | Muy LatAm/AR; autoriza por tienda |
| WooCommerce | API keys / OAuth por sitio |
| BigCommerce, PrestaShop, Magento, VTEX | Variantes del mismo enfoque |
| Amazon SP-API, eBay | OAuth por vendedor (más complejos) |

**Prioridad si el gym quiere vender al público (AR):**

1. Mercado Libre  
2. Tiendanube  
3. Shopify  
4. WooCommerce  

### 3. Adapter de tienda (diseño)

Misma idea que el adapter de acceso del MVP:

```text
StoreProvider
  publishProduct / updateStock / updatePrice
  getOrders / syncProducts
```

Implementaciones: `MercadoLibreProvider`, `TiendanubeProvider`, `ShopifyProvider`, `WooCommerceProvider`.  
El resto del SaaS no debe acoplarse a un marketplace concreto.

### 4. Flujo del afiliado en la app del gym ≠ Mercado Libre

Para **socio que compra en la app y retira en el gym**, lo conveniente es:

```text
App del gym → checkout propio → Mercado Pago → pedido → retiro en sucursal
```

**No** mandar al afiliado a comprar en Mercado Libre:

- Sale de la app / login ML  
- Comisiones ML  
- Se pierde control de promos, packs, puntos, combos con membresía  

**Regla de oro (post-MVP tienda):**

| Canal | Cómo |
|-------|------|
| Venta a **socios** (in-app) | Checkout propio + **Mercado Pago** |
| Venta al **público** (opcional) | Integración marketplace (ML, Tiendanube, …) |

---

## Implicancias para GymBro

- El MVP ya usa **MP del gym** para cuotas/packs: la tienda in-app puede **reusar** ese mismo camino de cobro.
- La “tienda del mockup FitApp” encaja como **módulo post-MVP de checkout propio**, no como “ser un seller en ML”.
- Conectar ML/Tiendanube es un **módulo aparte** (canal externo), con OAuth por tenant.
- Diseñar `StoreProvider` desde el día 1 del módulo tienda evita rewrites al sumar marketplaces.

---

## No hacer / evitar

- Usar Mercado Libre como checkout principal de la app del afiliado.
- Una app ML distinta por gym (innecesario e inmantenible).
- Mezclar en un solo módulo “catálogo interno” + “sync a ML” sin límites claros.

---

## Siguiente paso sugerido

- [x] Guardar en `docs/ideas/`
- [ ] Cuando se abra el módulo Tienda: promover a backlog con dos épicas — **Tienda in-app (MP)** y **Canales marketplace (OAuth)**
- [ ] Sesión de definición con [método producto](../10-metodo-definicion-producto.md)

---

[Ideas](./README.md) · [Índice docs](../00-indice.md) · [Backlog post-MVP](../99-backlog-post-mvp.md)
