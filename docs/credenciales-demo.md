# Credenciales demo (local)

**Solo desarrollo.** No usar en producción.  
Origen: seed [`api/prisma/seed.ts`](../api/prisma/seed.ts).  
Arranque desde cero (migraciones + seed): [13-setup-db-desde-cero.md](./13-setup-db-desde-cero.md).

```powershell
docker compose exec api npm run prisma:seed
```

Password común a todos: **`ChangeMe123!`**

Tenant demo: slug **`demo`** · id **`00000000-0000-4000-8000-000000000001`** (`Demo Gym`)

Admin web Staff: **http://demo.localhost:3000/login** (sin pegar tenantId)  
Super Admin: **http://localhost:3000/super/login**

---

## Cuentas

| Perfil | Email | Password | Extra |
|--------|--------|----------|--------|
| Super Admin | `super@gymbro.local` | `ChangeMe123!` | Sin tenant · `/super/login` |
| Staff (Admin del gym) | `admin@demo.gym` | `ChangeMe123!` | slug `demo` · `demo.localhost:3000` |
| Afiliado (Member) | `socio@demo.gym` | `ChangeMe123!` | slug `demo` · app Flutter / API |

El staff demo queda con rol sistema **Admin** tras el seed.  
El afiliado demo queda `status: ACTIVE` (solo ACTIVE puede hacer login).

Quark del demo (soft-fail si los servicios no están): wallets `gymbro-iss-demo` / `gymbro-ver-demo` en columnas `tenants.quark_*`. Ver [13-setup-db-desde-cero.md](./13-setup-db-desde-cero.md).

---

## Login (API)

Base: `http://localhost:3001`

### Super

```http
POST /api/auth/super/login
Content-Type: application/json

{
  "email": "super@gymbro.local",
  "password": "ChangeMe123!"
}
```

### Staff

```http
POST /api/auth/staff/login
Content-Type: application/json

{
  "tenantSlug": "demo",
  "email": "admin@demo.gym",
  "password": "ChangeMe123!"
}
```

(`tenantId` UUID sigue aceptado por compatibilidad.)

### Afiliado

```http
POST /api/auth/member/login
Content-Type: application/json

{
  "tenantSlug": "demo",
  "email": "socio@demo.gym",
  "password": "ChangeMe123!"
}
```

(`tenantId` UUID sigue aceptado por compatibilidad.)

---

## Owner al crear tenant (Super)

`POST /api/tenants` crea además un staff owner (email/password que indiques en el body) con rol Admin. Eso **no** es la cuenta seed de arriba; es por gym nuevo.

---

[Índice](./00-indice.md) · [Postman](../postman/README.md) · [README](../README.md)
