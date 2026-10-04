# Faciliter Web (landing + Admin + Super)

Next.js App Router — sitio público, panel staff y Super Admin.

## Sitio público (apex, sin slug de gym)

**`http://localhost:3002/`** — landing, pricing y SEO. Guía de uso: `/docs`. Burbuja del asistente (misma UI que el Admin; `#asistente` la abre). Legales: `/legal/terminos`, `/legal/privacidad`. Sitemap: `/sitemap.xml`. Canonical: `NEXT_PUBLIC_SITE_URL`.

El panel Staff **no** vive en el apex: hace falta el subdominio del gym.

## Web del gym (tenant por subdominio)

Entrar por **`http://{slug}.localhost:3002`** (demo: `http://demo.localhost:3002`).

Con tunnel: `{slug}.{NEXT_PUBLIC_APP_DOMAIN}` (ej. `https://demo.pruebasaproduccunon.uno`).

| Ruta | Uso |
|------|-----|
| `/` | Vidriera pública: packs del gym; **Comprar** solo si el gym conectó Mercado Pago (indexable) |
| `/login` | Login único con la cuenta Faciliter: staff → `/dashboard`, socio → `/portal`, ambos → elige |
| `/comprar?pack=` | Socio: suma el pack al carrito y va a `/portal/carrito`. No socio: nombre, DNI, teléfono → checkout MP; el socio nace con el pago aprobado |
| `/cuenta` | Cuenta de quien entró (avatar del header): datos, contraseña, cerrar sesión y accesos al portal / panel. En el apex: cuenta Faciliter con tenants y plan |
| `/portal` | Portal del socio, inicio: próximas clases, planes vigentes y resultado del pago (`?compra=`). `?alta=` espera el alta pagada |
| `/portal/clases` | Calendario del mes: reservar con créditos, drop-in al carrito sin créditos, lista de espera |
| `/portal/mis-clases` | Próximas reservas y lista de espera (cancelar / salir) + pasadas y canceladas |
| `/portal/tienda` · `/portal/carrito` | Planes al carrito; carrito de packs y clases sueltas, un solo pago MP (`returnToWeb`) |
| `/portal/historial` | Todos los comprobantes con detalle y pedido de devolución por línea |
| `/dashboard` | Panel staff: KPIs del día |
| `/dashboard/afiliados` | Listado / alta / ficha + estado de cuenta |
| `/dashboard/servicios` | Catálogo de servicios |
| `/dashboard/packs` | Packs + componentes |
| `/dashboard/sesiones` | Sesiones puntuales + roster / reserva CREDIT |
| `/dashboard/roles` / `/dashboard/staff` | Roles y staff |
| `/dashboard/config` | Settings + Mercado Pago |
| `/dashboard/caja` | Caja del día |
| `/dashboard/devoluciones` | Cola de solicitudes + ejecutar reembolso (`transaction_items.refund`) |
| `/dashboard/reportes` | Ingresos del período (detalle nominado) + snapshot packs/activos |
| `/dashboard/puerta` | Tabs: Verificar (OID4VP) · Pase manual · Historial; `/dashboard/puerta/pase-manual` → `?tab=pase` |
| Asistente | Drawer (topbar); no hay ruta `/asistente` |

Las rutas viejas del panel en la raíz (`/caja`, `/puerta/...`, `/config?mp=...`) redirigen con 308 a `/dashboard/...` (`middleware.ts`). En `admin.{dominio}` la raíz va al apex.

## Rutas Super (apex, bajo `/super`)

**`http://localhost:3002/super/...`** (sin slug de gym; noindex).

| Ruta | Uso |
|------|-----|
| `/super/login` | Login Super |
| `/super/tenants` | Listado / alta / editar / suspender |

## Setup

```powershell
Copy-Item web\.env.example web\.env
npm install
npm run dev
```

API en `NEXT_PUBLIC_API_URL` (default `http://localhost:3001`). Chat: `NEXT_PUBLIC_CHAT_API_URL` (default `http://localhost:3010`). Tras wipe de DB: seed a mano (`docs/13-setup-db-desde-cero.md`).

Credenciales: `docs/credenciales-demo.md`.

## Notas

- Sesiones por origen (`lib/auth/token-store.ts`): staff `gymbro.staff.session`, socio `gymbro.member.session`, cuenta Faciliter (Identity) aparte. Cerrar sesión en el gym limpia las tres y el carrito del socio (`lib/member-cart.ts`, `gymbro.member.cart`). Ambos usan la base `lib/local-store.ts`.
- Tema claro/oscuro: `data-theme` + `localStorage` clave `gymbro.theme` (default oscuro).
- Marca del Admin = slug del tenant (sidebar); Super = `SUPER`.
- CORS API acepta `*.localhost` además de `CORS_ORIGIN`.
- Prod futuro: `{slug}.{APP_DOMAIN}` (mismo extractor de Host). Landing en el apex / `NEXT_PUBLIC_SITE_URL`.
