# Setup DB desde cero — migraciones y seed

**Estado:** Viva  
**Cuándo usar:** primer arranque, o tras `docker compose down -v` (borra Postgres y volúmenes).

Credenciales demo: [credenciales-demo.md](./credenciales-demo.md).
Lista de migraciones / esquema: [09-esquema-db.md](./09-esquema-db.md).

---

## 1. Qué hace cada comando

| Comando | Para qué |
|---------|----------|
| `prisma migrate deploy` | Aplica **todas** las migraciones pendientes de `api/prisma/migrations/` (idempotente). Usar en Compose / DB limpia. |
| `prisma generate` | Regenera el client TypeScript en `node_modules` del contenedor (necesario tras wipe del volumen `api_node_modules`). |
| `npm run prisma:seed` | Carga datos demo: **Super**, tenant `demo`, branch, roles, staff, member + Quark issuer/verifier (soft-fail). |
| `npm run prisma:migrate` | Alias de `prisma migrate dev`: **crear** migración nueva en desarrollo (interactivo). No es el flujo “desde cero”. |

La API **no** corre migraciones ni seed al arrancar: hay que hacerlo a mano (o con este checklist).

---

## 2. Checklist — levantar de 0

```powershell
# 1) Stack
docker compose up --build -d

# 2) Esperar a que api/postgres estén healthy (opcional)
curl.exe -s http://localhost:3001/api/health

# 3) Schema + client
docker compose exec api npx prisma migrate deploy
docker compose exec api npx prisma generate

# 4) Datos demo (incluye Super)
docker compose exec api npm run prisma:seed

# 5) Si la API compiló con client viejo, reiniciar
docker compose restart api
```

Tras un wipe completo:

```powershell
docker compose down -v
docker compose up --build -d
# … luego pasos 3 → 5 de arriba
```

### Seed incluye

| Perfil | Email | Password |
|--------|-------|----------|
| Super | `super@gymbro.local` | `ChangeMe123!` |
| Staff (Demo Gym) | `admin@demo.gym` | `ChangeMe123!` |
| Afiliado | `socio@demo.gym` | `ChangeMe123!` |

Tenant demo: slug `demo`, id fijo `00000000-0000-4000-8000-000000000001`.

Quark (si `quark-issuer` / `quark-verifier` están arriba y `QUARK_PROVISION_ENABLED` ≠ false):

| Campo tenant | Valor típico |
|--------------|--------------|
| `quark_status` | `READY` (o `MISSING` + `quark_last_error` si Quark no responde) |
| `quark_issuer_wallet_id` | `gymbro-iss-demo` |
| `quark_verifier_wallet_id` | `gymbro-ver-demo` |

Script: [`api/prisma/seed.ts`](../api/prisma/seed.ts) + [`seed-quark-demo.ts`](../api/prisma/seed-quark-demo.ts). Idempotente; se puede re-ejecutar. El seed envía `oid4vc` (issuer) y `oid4vp` (verifier); sin `OpenId4Vc*Record` no marca `READY`.

---

## 3. Crear una migración nueva (día a día)

1. Editá `api/prisma/schema.prisma`.
2. Con Compose arriba:

```powershell
docker compose exec api npm run prisma:migrate
```

3. Actualizá [09-esquema-db.md](./09-esquema-db.md) (tablas / lista de migraciones).
4. En otros entornos / DB limpia: solo `migrate deploy` (+ `generate` si hace falta).

Desde el host (sin Docker para la API): en `api/.env` usá `localhost` en `DATABASE_URL`, luego `npm run prisma:migrate` dentro de `api/`.

---

## 4. Problemas frecuentes

| Síntoma | Qué hacer |
|---------|-----------|
| API: `Property '…' does not exist on type 'Pack'` (u otro modelo) | Falta `prisma generate` en el contenedor → paso 3 + `restart api`. |
| Health / queries: schema not ready | Falta `migrate deploy`. |
| No entra Super / staff demo | Falta `prisma:seed`. |
| Quark demo `MISSING` tras seed | ¿Están `quark-issuer`/`quark-verifier` up? Ver `quark_last_error`. El alta de issuer a veces tarda > timeout: re-ejecutá `prisma:seed` (idempotente; reconciliá 409). Ghost: reiniciá `quark-issuer` y re-seed. |
| Puerta OID4VP 404 / `request_uri` con UUID random | Verifier creado **sin** `oid4vp` (seed viejo): no hay `OpenId4VcVerifierRecord` con `verifierId=gymbro-ver-{slug}`. Wipe DB `quarkid_verifier`, nullificar `tenants.quark_verifier_*`, re-seed o Super “Reintentar”. Ver fila abajo. |
| Verifier incompleto (sin OpenId4VcVerifierRecord) | `docker compose stop quark-verifier` → en Postgres: `DROP SCHEMA public CASCADE; CREATE SCHEMA public;` sobre DB `quarkid_verifier` (o recrear la DB) → `docker compose up -d quark-verifier` → limpiar refs en GymBro (`UPDATE tenants SET quark_verifier_wallet_id=NULL, quark_verifier_did=NULL, quark_status='MISSING' WHERE slug='demo';`) → `npm run prisma:seed` o Super Reintentar. El seed/provision ahora envía `oid4vp.clientMetadata`. |
| 404 raros en Next tras wipe | Volumen `web_next`; a veces hace falta recrear o limpiar `.next` del contenedor. |

---

## 5. Qué no automatizamos (aún)

- Migraciones al `CMD` de la API (opcional a futuro solo en Compose local).
- Seed automático (podría pisar datos locales; se deja explícito).

---

[Índice](./00-indice.md) · [Esquema DB](./09-esquema-db.md) · [Credenciales demo](./credenciales-demo.md) · [README](../README.md)
