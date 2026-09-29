# Planes en landing, alta self-serve y módulos por tenant

**Fecha:** 2026-09-28  
**Estado:** idea — no implementar en el mismo corte que el catálogo público  
**Hecho (corte 1):** `GET /public/platform/packs` + landing lista packs/servicios del tenant `admin`.

---

## 2. Dueño elige plan en la landing y paga (self-serve)

Hoy el gym nace a mano (plataforma crea tenant) y el pack TENANT se cobra en Caja de `admin`.

Falta definir:

- ¿Identity Faciliter primero, después el gym?
- ¿MP del dueño vs cobro por el equipo Faciliter?
- Alta automática de tenant + owner + contrato TENANT al webhook

Es otro producto encima del contrato TENANT que ya existe.

---

## 3. Módulos por plan (activar según servicios del pack)

Pack = oferta. Servicios del pack = “qué incluye”. **No** es lo mismo que prender Caja, Sesiones o Puerta en runtime.

Hoy el recorte es por **roles de staff**, no por plan. Gating por módulo tocaría API, nav, app y chat, más mapa servicio→módulo y gyms ya existentes.

Encajaría cuando haya más de un SKU vendible y un piloto pagando.

---

[Backlog producto](../99-backlog-post-mvp/producto.md) · [Índice post-MVP](../99-backlog-post-mvp.md)
