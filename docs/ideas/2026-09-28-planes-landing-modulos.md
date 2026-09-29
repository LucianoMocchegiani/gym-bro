# Planes en landing, alta self-serve y módulos por tenant

**Fecha:** 2026-09-28  
**Estado:** corte 4 en código (self-serve alta gym) — renovar/cambiar/baja de mandato pendientes  
**Hecho (corte 1):** `GET /public/platform/packs` + landing lista packs.  
**Hecho (corte 2):** Plan/Uso + prueba Caja.  
**Hecho (corte 3):** modo limitado RN-PAG-018.  
**Hecho (corte 4):** landing Contratar → Identity → wizard slug → preapproval MP de `admin`; gym nace en webhook. Apex `/cuenta`: `AccountPanel` + Mis tenants + PlanPanel lectura.

Cerrado (sesión 2026-09-28): Identity 1:N tenants; primer pago = primer gym; MP de cobro = MP de `admin`; slug lo elige el comprador **antes** de la Preference.

---

## 1. Un panel, dos puertas

El contrato Faciliter↔gym es siempre un `Contract` `TENANT` del gym, cobrado en Caja de `admin`. **Renovar, cambiar pack y ver vencimiento no son pantallas distintas** en apex vs slug: es el mismo componente `PlanPanel` con `tenantId` del gym.

| Puerta | Host | Quién | Lista de gyms | Alta de gym nuevo |
|--------|------|-------|---------------|-------------------|
| **Apex** `/cuenta` (pestaña Planes) | `faciliter.xyz` | Identity dueño | Sí: todos los tenants `ownerIdentityId = yo` | Sí: pack + slug + pagar (self-serve) |
| **Gym** Sistema → Plan / Uso | `{slug}.faciliter.xyz` | Staff de **ese** tenant | No (el gym es el del host) | No |

Dos caminos de **cobro** (misma Caja `admin`):

1. **Self-serve** (Identity, MP Checkout Preference).
2. **Caja plataforma** (staff `admin` cobra en mostrador, como hoy).

El panel de Plan no sustituye Caja: Caja sigue para cobros asistidos y gyms que nació el equipo.

---

## 2. Wireframe compartido (`PlanPanel`)

```
┌─ Plan Faciliter ─────────────────────────────────────────┐
│ Gym: Iron Gym · iron.faciliter.xyz                       │
│                                                          │
│  Pack actual     Faciliter Brain Basic                   │
│  Estado          Prueba · vence 28 oct 2026              │
│                  o Vigente · próximo débito 28 oct       │
│  Incluye         [servicios del pack, lista]             │
│  Aviso           Podés dar de baja antes del débito.     │
│                                                          │
│  [ Cambiar plan ]  [ Dar de baja ]                       │
│                                                          │
│  ── Si no hay TENANT vigente ────────────────────────── │
│  Sin pack Faciliter. El gym sigue; no hay cobro activo. │
│  [ Contratar plan ]                                      │
└──────────────────────────────────────────────────────────┘

Apex, encima del panel (solo si 0 o N gyms):
┌─ Tus gyms ───────────────────────────────────────────────┐
│ ○ Iron Gym (vigente)   [Ver plan]                        │
│ ○ Otro Gym (sin pack)  [Ver plan]                        │
│ [ + Nuevo gym ]  → wizard: nombre, slug, pack, pagar    │
└──────────────────────────────────────────────────────────┘
```

**Pack MONTHLY de plataforma = suscripción MP** (mismo patrón que el afiliado: `preapproval` en la cuenta de `admin`, RN-PAG-013..016). No es un Preference de un solo cobro para el plan vivo. Caja `admin` (efectivo / link suelto) sigue existiendo para altas asistidas.

**Renovar:** no es un botón de “pagar otra vez”. El débito corre solo. En el panel: próximo cobro, baja (cancela `preapproval`; el `TENANT` sigue hasta `endsAt`).

**Cambiar plan:** como RN-PAG-016: baja el mandato A, alta B para el **próximo** cobro (sin prorrateo; un `TENANT` vigente).

**Contratar / Nuevo gym:** slug + pack **antes** del checkout MP. Ver §6 (prueba vs nace al pagar).

---

## 3. Auth

| Acción | Apex | Slug gym |
|--------|------|----------|
| Ver plan | Identity dueño de ese tenant | Staff con permiso de lectura (p.ej. `tenant.settings.read` o `caja.read`; **no** todo el staff) |
| Renovar / cambiar / contratar | Identity dueño | **Solo dueño** (staff ligado a la misma Identity que `ownerIdentityId`), no un Admin genérico |

Impersonación plataforma: el staff `admin` en el gym **no** usa este panel para “pagar como dueño”; cobra en Caja de `admin`. El dueño impreso ve Plan/Uso como el dueño.

JWT Identity **no** llama a `/staff/me` en apex. Endpoints de Plan self-serve: `/identity/tenants`, `/identity/tenants/:id/plan`, `POST .../checkout` (nombres de trabajo).

---

## 4. Orden de cortes (cuando se implemente)

1. API + `PlanPanel` + gym Sistema Plan/Uso (ver + renovar + cambiar; gym ya existe).
2. Apex `/cuenta` Planes: lista gyms del Identity + mismo panel.
3. Wizard **Nuevo gym** (slug + pack + checkout suscripción MP + webhook).
4. Fuera: módulos por plan (gating nav). Avisos mail/WhatsApp del débito = E8 (el panel avisa en UI desde el corte 1).

---

## 5. Módulos por plan (sigue post-MVP)

Pack = oferta. Servicios del pack ≠ prender Caja/Sesiones/Puerta. Gating por módulo = otro corte.

---

## 6. Mes de prueba + débito (clásico)

No es un tercer producto: es el **mismo mandato MONTHLY** con `start_date` del cobro = fin de prueba (igual que RN-PAG-014 camino 2: autoriza ahora, cobra después).

| Momento | Qué pasa |
|---------|----------|
| Checkout MP | Autoriza la suscripción en MP de `admin`. Si hay prueba: **no** hay peso. Copy: “El primer mes no se cobra. Podés dar de baja antes de [fecha].” |
| Webhook `preapproval` autorizado (con prueba) | **Ahí nace el gym.** |
| Webhook cobro approved (sin prueba) | **Ahí nace el gym** (2.º gym de la misma cuenta, o tenant que ya usó la prueba). |
| Durante la prueba | Gym usable. Baja = cancelar `preapproval`; el gym sigue hasta `endsAt` y queda sin pack. |
| Pasa la fecha | MP debita. Webhook → ciclo pago del `TENANT`. |
| Falla el débito | Reintentos de MP. Si el mandato queda **fallido**: gracia **3 días**, después **modo limitado** (§7). |

**Una sola prueba, dos candados (los dos):**

| Candado | Efecto |
|---------|--------|
| Por **cuenta** (Identity) | El mes gratis es **una vez en la vida de esa Identity**. El 2.º gym de la misma persona **paga desde el día 1**. |
| Por **tenant** | Ese gym no vuelve a tener 30 días gratis: cambiar de pack, dar de baja y volver a contratar, o reactivar, **no** reinicia la prueba. |

Caja `admin`: mismo mes de prueba, **opcional** (tilde). Mismos candados: si la Identity del dueño o ese gym ya usaron la prueba, el tilde no aplica (cobro normal). Usar la prueba en Caja **consume** la de la cuenta y la del tenant: después el self-serve no da otros 30 días.

En Caja el gym **ya existe** (alta en Tenants o ya venía). La prueba no “nace el gym”; arranca un `TENANT` de 30 días.

- **Con débito:** igual que el socio: link MP, cobra al terminar la prueba.
- **Efectivo / sin débito:** 30 días de pack sin peso ahora; el mes 2 es otro cobro en Caja o el dueño se suscribe en la web (sin segunda prueba).

Abuso de otro mail/Google: fuera de este corte.

Modelo: flags `identity.platformTrialUsedAt` y `tenant.platformTrialUsedAt` (nombres de trabajo). Mandato plataforma = gym + pack + preapproval de `admin` (sin `memberId`).

---

## 7. Modo limitado (plan caído)

**Excepción fija (allowlist por id, no por “nunca tuvo plan”):**

- Demo seed: `00000000-0000-4000-8000-000000000001` (`gym-de-prueba`)
- Plataforma: `00000000-0000-4000-8000-000000000002` (`admin`)

Esos dos **nunca** entran en modo limitado. `admin` no es un gym cliente: es Caja/Tenants de Faciliter; no tiene (ni debe tener) un `TENANT` pagándose a sí mismo.

Cualquier **otro** gym: si no hay `TENANT` vigente y pasaron **3 días** desde el vencimiento **o**, si nunca tuvo plan, desde el **alta del tenant**, queda limitado.

**Modo limitado:** login **sí**. Operación **no** (API + nav). Permitido: Plan / Uso (renovar), Mi cuenta, salir. Popup **una vez por sesión**; **barra fija** bajo el topbar. Impersonación `admin`: gym completo (soporte).

---

## Decisiones

| Decisión | Valor |
|----------|--------|
| Identity | 1:N tenants; primer pago = primer gym |
| MP | Cuenta `admin` (suscripción / Caja) |
| Slug | Lo elige el comprador antes del checkout |
| Alta self-serve | Con prueba: nace al autorizar el débito ($0). Sin prueba: nace en el primer cobro. Slug se revalida en el webhook |
| Plan MONTHLY | Suscripción MP (`admin`). Renovar = el débito; baja = cancela preapproval |
| Prueba | **30 días, cualquier pack, una vez por Identity y una vez por tenant.** Self-serve: siempre que los candados lo permitan. Caja: **tilde opcional**, mismos candados; usarla en Caja gasta la prueba. Mail/WhatsApp = E8 |
| UI Plan | Un `PlanPanel` en apex y en `{slug}` (estado, próximo cobro, cambiar, baja) |
| Pagar / baja en el gym | Solo dueño (`ownerIdentityId`), no Admin genérico |
| TENANT vigente | Uno por gym. Cambio de pack = mandato A→B al próximo cobro (RN-PAG-016) |
| Plan caído | Gracia **3 días**. Después: entrar sí, operar no; solo Plan / renovar + banner + popup 1× sesión. Allowlist por id: demo `…0001` y plataforma `admin` `…0002`. El resto se limita |

---

[Backlog producto](../99-backlog-post-mvp/producto.md) · [Índice post-MVP](../99-backlog-post-mvp.md)
