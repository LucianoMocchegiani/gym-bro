# Faciliter Web (landing + Admin + Super)

Next.js App Router — sitio público, panel staff y Super Admin.

## Sitio público (apex, sin slug de gym)

**`http://localhost:3002/`** — landing, pricing y SEO. Guía de uso: `/docs`. Burbuja del asistente (misma UI que el Admin; `#asistente` la abre). Legales: `/legal/terminos`, `/legal/privacidad`. Sitemap: `/sitemap.xml`. Canonical: `NEXT_PUBLIC_SITE_URL`.

El panel Staff **no** vive en el apex: hace falta el subdominio del gym.

## Rutas Staff (tenant por subdominio)

Entrar por **`http://{slug}.localhost:3002`** (demo: `http://demo.localhost:3002`).

Con tunnel: `{slug}.{NEXT_PUBLIC_APP_DOMAIN}` (ej. `https://demo.pruebasaproduccunon.uno`).

| Ruta | Uso |
|------|-----|
| `/login` | Login Staff (slug desde el Host; sin UUID) |
| `/` | Dashboard: KPIs del día (solo con slug de tenant) |
| `/afiliados` | Listado / alta / ficha + estado de cuenta |
| `/servicios` | Catálogo de servicios |
| `/packs` | Packs + componentes |
| `/sesiones` | Sesiones puntuales + roster / reserva CREDIT |
| `/roles` / `/staff` | Roles y staff |
| `/config` | Settings + Mercado Pago |
| `/caja` | Caja del día |
| `/devoluciones` | Cola de solicitudes + ejecutar reembolso (`transaction_items.refund`) |
| `/reportes` | Ingresos del período (detalle nominado) + snapshot packs/activos |
| `/puerta` | Tabs: Verificar (OID4VP) · Pase manual · Historial; `/puerta/pase-manual` → `?tab=pase` |
| Asistente | Drawer (topbar); no hay ruta `/asistente` |

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

API en `NEXT_PUBLIC_API_URL` (default `http://localhost:3001`). Chat: `NEXT_PUBLIC_CHAT_API_URL` (default `http://localhost:3010`). Tras migración de slug: `docker compose exec api npx prisma migrate deploy` + seed.

Credenciales: `docs/credenciales-demo.md`.

## Notas

- Staff: sesión `gymbro.staff.session`; Super: `gymbro.super.session` (separadas).
- Tema claro/oscuro: `data-theme` + `localStorage` clave `gymbro.theme` (default oscuro).
- Marca del Admin = slug del tenant (sidebar); Super = `SUPER`.
- CORS API acepta `*.localhost` además de `CORS_ORIGIN`.
- Prod futuro: `{slug}.{APP_DOMAIN}` (mismo extractor de Host). Landing en el apex / `NEXT_PUBLIC_SITE_URL`.
