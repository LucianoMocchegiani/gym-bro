# Setup DB desde cero — migraciones y seed

**Estado:** Viva  
**Cuándo usar:** primer arranque, o tras `docker compose down -v` (borra Postgres y volúmenes).

Credenciales demo: [credenciales-demo.md](./credenciales-demo.md).
Lista de migraciones / esquema: [09-esquema-db.md](./09-esquema-db.md).

---

## 1. Qué hace cada comando

| Comando | Para qué |
|---------|----------|
| `prisma migrate deploy` | GymBro: la API lo corre al arrancar. Chat: `chat-api` corre `ensure-db` + `migrate deploy` al arrancar. |
| `prisma generate` | En la imagen Docker ya va generado. En el host: `npx prisma generate` tras cambiar el schema. |
| `npm run prisma:seed` | Carga datos demo: **Super**, tenant `gym-de-prueba`, branch, roles, staff, member. **No** corre al arrancar. |
| `npm run prisma:migrate` | Alias de `prisma migrate dev`: **crear** migración nueva (interactivo). En el host, con `DATABASE_URL` a `localhost:5433`. |

La API aplica migraciones al `CMD`. El seed **no**: hay que ejecutarlo a mano (o con este checklist).

---

## 2. Checklist — levantar de 0

```powershell
# 1) Stack (api y chat-api migran solas al arrancar)
docker compose up --build -d

# 2) Esperar health
curl.exe -s http://localhost:3001/api/health
curl.exe -s http://localhost:3010/health
curl.exe -s http://localhost:3011/health

# 3) Datos demo (incluye Super) — una vez, no en cada restart
docker compose exec api npm run prisma:seed
```

Tras un wipe completo:

```powershell
docker compose down -v
docker compose up --build -d
# … luego el seed (paso 3)
```

### Seed incluye

| Perfil | Email | Password |
|--------|-------|----------|
| Super | `super@faciliter.xyz` | `ChangeMe123!` |
| Staff (Demo Gym) | `admin@gymdeprueba.com` | `ChangeMe123!` |
| Staff Profesor | `profesor@gymdeprueba.com` | `ChangeMe123!` |
| Afiliado | `socio@gymdeprueba.com` | `ChangeMe123!` |

Tenant demo: slug `gym-de-prueba`, id fijo `00000000-0000-4000-8000-000000000001`.

Kuatia: el seed **no** crea productos. Wallets compartidos van en `api/.env` (`KUATIA_*`). Script: [`api/prisma/seed.ts`](../api/prisma/seed.ts). Idempotente; **cada run resetea** las passwords demo a `ChangeMe123!`.

---

## 3. Crear una migración nueva (día a día)

1. Editá `api/prisma/schema.prisma`.
2. Con Postgres arriba, **desde el host** (`api/.env` con `localhost:5433`):

```powershell
cd api
npm run prisma:migrate
```

3. Rebuild para que la imagen copie la migración nueva:

```powershell
docker compose up --build -d api
```

4. Actualizá [09-esquema-db.md](./09-esquema-db.md) (tablas / lista de migraciones).

Al arrancar, la API aplica la migración nueva sola (`migrate deploy`).

---

## 4. Problemas frecuentes

| Síntoma | Qué hacer |
|---------|-----------|
| API: `Property '…' does not exist on type 'Pack'` (u otro modelo) | Schema nuevo: rebuild de la imagen `docker compose up --build -d api`. |
| Health / queries: schema not ready | Esperá el `start_period` o mirá logs: `docker compose logs api`. |
| No entra Super / staff demo | Falta `prisma:seed`. |
| Kuatia demo `MISSING` tras seed | Completá `KUATIA_ISSUER_WALLET_ID` / `KUATIA_VERIFIER_WALLET_ID` (y keys/bases) en `api/.env`; re-ejecutá `prisma:seed` o Super “Reintentar”. |
| Offer/VP fallan con 401 | API key incorrecta o header ausente (`x-api-key`); ver [kuatia.xyz/docs/autenticacion](https://kuatia.xyz/docs/autenticacion). |
| Web no refleja `NEXT_PUBLIC_*` | Esas vars se bakean en el build. Cambiá el `.env` de la raíz (o export) y `docker compose up --build -d web`. |

---

## 5. Limpiar cobros de prueba (sin wipe del volumen)

Borra carts, ítems, receipts, caja, contratos, reservas y waitlist. **No** borra gym, staff, afiliados ni catálogo. El siguiente comprobante vuelve a `GB-000001`.

```powershell
Get-Content -Raw api\prisma\limpiar-cobros-dev.sql |
  docker compose exec -T postgres psql -U gymbro -d gymbro -v ON_ERROR_STOP=1
```

Script: [`api/prisma/limpiar-cobros-dev.sql`](../api/prisma/limpiar-cobros-dev.sql). Solo desarrollo.

Solo cobros **STUB** de un tenant (default `gym-de-prueba`; no toca CASH/MP):

```powershell
docker compose exec api npm run prisma:purge-stub
```

El valor enum `STUB` queda en Prisma (legado).

---

## 6. Qué no automatizamos

- Seed automático: cada `prisma:seed` **resetea** passwords demo a `ChangeMe123!`. Se deja explícito.

---

[Índice](./00-indice.md) · [Esquema DB](./09-esquema-db.md) · [Credenciales demo](./credenciales-demo.md) · [README](../README.md)
