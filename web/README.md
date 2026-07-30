# GymBro Web (Admin)

Next.js App Router — panel staff.

## Rutas

| Ruta | Uso |
|------|-----|
| `/` | Dashboard mínimo: KPIs del día + atajos |
| `/login` | Login Staff (`tenantId` + email + password) |
| `/afiliados` | Listado / alta / ficha + estado de cuenta |
| `/servicios` | Catálogo de servicios (acceso libre / por sesiones) |
| `/packs` | Packs + componentes (servicios + créditos) |
| `/sesiones` | Sesiones puntuales (editar, cancelar, ampliar cupo) |
| `/roles` | Roles custom + permisos; link a staff |
| `/staff` | Alta staff + asignación multi-rol |
| `/config` | Settings operativos + cuenta Mercado Pago |
| `/caja` | Caja del día, cobro CASH (pack/drop-in), arqueo |
| `/puerta` | Verificar ingreso (pegar token stub) + historial |
| `/puerta/pase-manual` | Pase manual (CU-ACC-004) |

## Setup

```powershell
Copy-Item web\.env.example web\.env
npm install
npm run dev
```

Abrí http://localhost:3000 — la API debe estar en `NEXT_PUBLIC_API_URL` (default `http://localhost:3001`).

Credenciales demo: ver `docs/credenciales-demo.md`.

## Notas

- Sesión en `localStorage` (access + refresh); refresh automático ante 401.
- Sin cámara QR en este slice (stub: pegar `stub:…`).
- La API habilita CORS vía `CORS_ORIGIN` (default `http://localhost:3000`).
- Cliente HTTP en `lib/api/` espeja módulos Nest (`auth`, `members`, `access`, `cash-register`, `contracts`, `services`, `packs`, `sessions`, `reservations`, `roles`, `staff`, `tenant-settings`, `mercadopago`).
