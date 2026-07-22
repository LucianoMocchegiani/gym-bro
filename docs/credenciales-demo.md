# Credenciales demo (local)

**Solo desarrollo.** No usar en producción.  
Origen: seed [`api/prisma/seed.ts`](../api/prisma/seed.ts).

```powershell
docker compose exec api npm run prisma:seed
```

Password común a todos: **`ChangeMe123!`**

Tenant demo id: **`00000000-0000-4000-8000-000000000001`** (`Demo Gym`)

---

## Cuentas

| Perfil | Email | Password | Extra |
|--------|--------|----------|--------|
| Super Admin | `super@gymbro.local` | `ChangeMe123!` | Sin tenant |
| Staff (Admin del gym) | `admin@demo.gym` | `ChangeMe123!` | `tenantId` = tenant demo |
| Afiliado (Member) | `socio@demo.gym` | `ChangeMe123!` | `tenantId` = tenant demo |

El staff demo queda con rol sistema **Admin** tras el seed.  
El afiliado demo queda `status: ACTIVE` (solo ACTIVE puede hacer login).

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
  "tenantId": "00000000-0000-4000-8000-000000000001",
  "email": "admin@demo.gym",
  "password": "ChangeMe123!"
}
```

### Afiliado

```http
POST /api/auth/member/login
Content-Type: application/json

{
  "tenantId": "00000000-0000-4000-8000-000000000001",
  "email": "socio@demo.gym",
  "password": "ChangeMe123!"
}
```

La respuesta trae `accessToken` / `refreshToken`. En Postman: environment **GymBro Local** + carpeta Auth.

---

## Owner al crear tenant (Super)

`POST /api/tenants` crea además un staff owner (email/password que indiques en el body) con rol Admin. Eso **no** es la cuenta seed de arriba; es por gym nuevo.

---

[Índice](./00-indice.md) · [Postman](../postman/README.md) · [README](../README.md)
