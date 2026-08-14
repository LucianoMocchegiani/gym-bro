# GymBro Web (Admin + Super)

Next.js App Router — panel staff y Super Admin.

## Rutas Staff (tenant por subdominio)

Entrar por **`http://{slug}.localhost:3002`** (demo: `http://demo.localhost:3002`).

Con tunnel: `{slug}.{NEXT_PUBLIC_APP_DOMAIN}` (ej. `https://demo.pruebasaproduccunon.uno`).

| Ruta | Uso |
|------|-----|
| `/login` | Login Staff (slug desde el Host; sin UUID) |
| `/` | Dashboard mínimo: KPIs del día + atajos |
| `/afiliados` | Listado / alta / ficha + estado de cuenta |
| `/servicios` | Catálogo de servicios |
| `/packs` | Packs + componentes |
| `/sesiones` | Sesiones puntuales + roster / reserva CREDIT |
| `/roles` / `/staff` | Roles y staff |
| `/config` | Settings + Mercado Pago |
| `/caja` | Caja del día |
| `/devoluciones` | Cola de solicitudes + ejecutar reembolso (`payments.refund`) |
| `/reportes` | Ingresos del período (detalle nominado) + snapshot packs/activos |
| `/puerta` | Tabs: Verificar (OID4VP) · Pase manual · Historial; `/puerta/pase-manual` → `?tab=pase` |

## Rutas Super (apex)

**`http://localhost:3002/super/...`** (sin slug de gym).

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

API en `NEXT_PUBLIC_API_URL` (default `http://localhost:3001`). Tras migración de slug: `docker compose exec api npx prisma migrate deploy` + seed.

Credenciales: `docs/credenciales-demo.md`.

## Notas

- Staff: sesión `gymbro.staff.session`; Super: `gymbro.super.session` (separadas).
- Tema claro/oscuro: `data-theme` + `localStorage` clave `gymbro.theme` (default oscuro).
- Marca del Admin = slug del tenant (sidebar); Super = `SUPER`.
- CORS API acepta `*.localhost` además de `CORS_ORIGIN`.
- Prod futuro: `{slug}.gymbro.app` (mismo extractor de Host).
