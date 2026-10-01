# Credenciales demo (local)

**Solo desarrollo.** No usar en producción.  
Origen: seed [`api/prisma/seed.ts`](../api/prisma/seed.ts).  
Arranque desde cero (migraciones + seed): [13-setup-db-desde-cero.md](./13-setup-db-desde-cero.md).

```powershell
# El seed necesita Node 24 (el del contenedor); el Node del host no soporta
# --experimental-strip-types.
docker cp api/prisma/seed.ts facilitation-api:/app/prisma/seed.ts
docker exec facilitation-api sh -c "cd /app && npx prisma db seed"
```

Password común a todos: **`ChangeMe123!`**

Tenant demo: slug **`gym-de-prueba`** · id **`00000000-0000-4000-8000-000000000001`** (`Gym de Prueba`)  
Tenant plataforma: slug **`admin`** · id **`00000000-0000-4000-8000-000000000002`** (`Faciliter Admin`)

Admin web Staff: **http://gym-de-prueba.localhost:3002/login** (sin pegar tenantId)  
Plataforma: **http://admin.localhost:3002/login**

> No existe un perfil `SUPER` ni `POST /api/auth/super/login`. La plataforma es el tenant `admin` y entra por el login de staff normal.

---

## Cuentas

| Perfil | Email | Password | Extra |
|--------|--------|----------|--------|
| Plataforma (tenant `admin`) | `admin@faciliter.xyz` | `ChangeMe123!` | `tenantSlug: admin` · rol `super-admin` · `admin.localhost:3002` |
| Staff (Admin del gym) | `admin@gymdeprueba.com` | `ChangeMe123!` | slug `gym-de-prueba` · `gym-de-prueba.localhost:3002` |
| Staff (Entrenador) | `entrenador@gymdeprueba.com` | `ChangeMe123!` | Sin caja ni débitos; sí reportes, puerta, sesiones, afiliados lectura |
| Afiliado (Member) | `socio@gymdeprueba.com` | `ChangeMe123!` | slug `gym-de-prueba` · app Flutter / API |

El staff demo queda con rol sistema **Admin** tras el seed. El segundo staff queda con rol **Entrenador** (`entrenador@…`).  
El afiliado demo queda `status: ACTIVE` (solo ACTIVE puede hacer login).

Kuatia del demo: `tenants.quark_*` = `KUATIA_ISSUER_WALLET_ID` / `KUATIA_VERIFIER_WALLET_ID` (compartidos). Ver [13-setup-db-desde-cero.md](./13-setup-db-desde-cero.md).

---

## Login (API)

Base: `http://localhost:3001`

### Plataforma (tenant `admin`)

```http
POST /api/auth/staff/login
Content-Type: application/json

{
  "tenantSlug": "admin",
  "email": "admin@faciliter.xyz",
  "password": "ChangeMe123!"
}
```

### Staff

```http
POST /api/auth/staff/login
Content-Type: application/json

{
  "tenantSlug": "gym-de-prueba",
  "email": "admin@gymdeprueba.com",
  "password": "ChangeMe123!"
}
```

(`tenantId` UUID sigue aceptado por compatibilidad.)

### Afiliado

```http
POST /api/auth/member/login
Content-Type: application/json

{
  "tenantSlug": "gym-de-prueba",
  "email": "socio@gymdeprueba.com",
  "password": "ChangeMe123!"
}
```

(`tenantId` UUID sigue aceptado por compatibilidad.)

---

## Owner al crear tenant (plataforma)

`POST /api/tenants` crea además un staff owner (email/password que indiques en el body) con rol Admin. Eso **no** es la cuenta seed de arriba; es por gym nuevo.

---

## Catálogo de plataforma

El seed crea en el tenant `admin` lo que la Caja de plataforma vende:

| Recurso | Nombre | Id |
|---------|--------|-----|
| Service | `Faciliter Brain` | `00000000-0000-4000-8000-000000000010` |
| Pack | `Faciliter Brain Basic` — 60000 ARS, `MONTHLY` | `00000000-0000-4000-8000-000000000011` |
| Pack | `Faciliter Brain Basic de prueba` — 100 ARS, `MONTHLY` | `00000000-0000-4000-8000-000000000016` |

---

[Índice](./00-indice.md) · [Postman](../postman/README.md) · [README](../README.md)
