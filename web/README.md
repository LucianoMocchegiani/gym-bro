# GymBro Web (Admin)

Next.js App Router — panel staff. Primer slice: **login + flujo puerta**.

## Rutas

| Ruta | Uso |
|------|-----|
| `/login` | Login Staff (`tenantId` + email + password) |
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
