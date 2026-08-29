# Guía de Prisma — GymBro

## Overview

GymBro usa **Prisma** como ORM. El schema se encuentra en `api/prisma/schema.prisma` y conecta a PostgreSQL.

---

## Comandos Principales

### `prisma generate`

Genera el **cliente Prisma** (tipos TypeScript y métodos) a partir del schema. **No modifica la base de datos.**

```bash
# En entorno local (dentro de /api)
npx prisma generate

# Dentro de Docker
docker-compose exec api npx prisma generate
```

**Cuando ejecutarlo:**
- Después de cualquier cambio en `schema.prisma` (nuevos campos, modelos, relaciones, renombres).
- Después de hacer `git pull` que actualizó el schema.
- Si TypeScript empieza a dar errores como `Property 'transactionItem' does not exist on type 'PrismaService'`.

**Importante:** `prisma generate` solo regenera el cliente en `node_modules/.prisma/client/`. No toca la base de datos.

---

### `prisma migrate`

Aplica cambios del schema a la **base de datos** (crea/modifica tablas, columnas, constraints, índices).

```bash
# Crea una nueva migración (genera archivo SQL)
npx prisma migrate dev --name nombre_del_cambio

# Aplica migraciones pendientes (en producción)
npx prisma migrate deploy

# Solo verifica el estado
npx prisma migrate status
```

**Atención:** En GymBro, las migraciones se ejecutan **manualmente** contra el contenedor Docker de Postgres. Esto es porque la migración original del rename `Payment` → `TransactionItem` y `CartCheckout` → `Transaction` requirió mover datos (no solo alterar schema) y se hizo con SQL directo.

---

### `prisma studio`

Abre una interfaz gráfica para inspeccionar y editar datos.

```bash
npx prisma studio
```

---

## Schema.prisma — Estructura

```
api/prisma/schema.prisma
├── generator client
│   ├── provider = "prisma-client-js"
│   └── binaryTargets = ["native", "linux-musl-openssl-3.0.x"]
│
├── datasource db
│   ├── provider = "postgresql"
│   └── url = env("DATABASE_URL")
│
└── model [NombreModelo] { ... }
```

Los modelos se mapean a tablas en Postgres. Cada campo se mapea a una columna.

---

## Workflow para Cambios en el Schema

### 1. Modificar el schema

Editar `api/prisma/schema.prisma` agregando/modificando modelos, campos o relaciones.

### 2. Generar el cliente

```bash
cd api
npx prisma generate
```

Esto actualiza `node_modules/.prisma/client/` con los nuevos tipos.

### 3. Verificar que compila

```bash
npx tsc --noEmit
```

Si hay errores de tipo, revisar que `prisma generate` haya corrido correctamente.

### 4. Aplicar a la base de datos

**Opción A — Con prisma migrate (para cambios de estructura simples):**

```bash
npx prisma migrate dev --name describe_el_cambio
```

**Opción B — Manualmente (para cambios complejos con datos):**

1. Escribir el SQL de migración en `api/prisma/migrations/`.
2. Ejecutar contra Postgres:

```bash
docker exec -i postgres psql -U postgres -d gymbro < migrations/mi_migracion.sql
```

3. Documentar el proceso en `manual_migration_guide.sql`.

### 5. Commitear

Incluir:
- `schema.prisma` actualizado
- Archivos de migración SQL generados
- Cualquier cambio en el código fuente que use los nuevos tipos

---

## Prisma en Docker

### Estructura del container

```
api (container de la API NestJS)
  └── /app
      ├── prisma/
      │   └── schema.prisma
      ├── node_modules/
      │   └── @prisma/client/        ← Cliente generado
      │   └── .prisma/client/        ← Tipos TypeScript generados
      └── src/                       ← Código fuente
```

### El problema común: schema desactualizado

Si el schema se actualizó pero `prisma generate` no se volvió a correr, el cliente Prisma dentro del container tendrá los **tipos viejos**. Esto causa errores como:

```
Property 'transactionItem' does not exist on type 'PrismaService'
```

**Solución:**

```bash
# 1. Regenerar el cliente dentro del container
docker-compose exec api npx prisma generate

# 2. Reiniciar el container
docker-compose restart api
```

### Rebuild completo de la imagen

Si el schema nuevo no está siendo copiado al container:

```bash
docker-compose build api --no-cache
docker-compose up -d api
```

### Verificar que el schema es el correcto dentro del container

```bash
docker-compose exec api cat prisma/schema.prisma | grep -A 5 "model TransactionItem"
```

---

## Regenerar Todo de Cero

Si hay problemas de sincronización entre el schema, el cliente y la DB:

```bash
# 1. En local, regenerar el cliente
cd api
rm -rf node_modules/.prisma
npx prisma generate

# 2. Verificar que el schema está bien
npx prisma validate

# 3. Si la DB también necesita actualizarse, aplicar migraciones
docker exec -i postgres psql -U postgres -d gymbro < api/prisma/migrations/mi_migracion.sql

# 4. Si hay dudas sobre el estado de la DB, verificar las tablas
docker exec -i postgres psql -U postgres -d gymbro -c "\dt"
```

---

## Modelos Principales de GymBro

| Modelo | Tabla | Descripción |
|--------|-------|-------------|
| `Tenant` | `tenants` | Gimnasio/organización |
| `Member` | `members` | Afiliado |
| `Contract` | `contracts` | Contrato de pack/sesiones |
| `Session` | `sessions` | Clase/sesión scheduled |
| `Reservation` | `reservations` | Reserva de sesión |
| `TransactionItem` | `transaction_items` | Pago individual (antes `Payment`) |
| `Transaction` | `transactions` | Checkout/carrito (antes `CartCheckout`) |
| `RefundRequest` | `refund_requests` | Solicitud de devolución |
| `Receipt` | `receipts` | Comprobante interno |

---

## Relaciones Típicas

```prisma
// Reservation tiene una TransactionItem opcional (el pago de esa reserva)
model Reservation {
  id              String    @id @default(uuid()) @db.Uuid
  transactionItemId String? @unique @map("transaction_item_id") @db.Uuid
  transactionItem TransactionItem? @relation(...)
}

// TransactionItem pertenece a una Transaction (checkout)
model TransactionItem {
  id            String    @id @default(uuid()) @db.Uuid
  transactionId String    @map("transaction_id") @db.Uuid
  transaction   Transaction @relation(...)
}
```

---

## Tips de Debug

### Error: `Property 'xxx' does not exist on type 'PrismaClient'`

Causa: El cliente Prisma no fue regenerado después de un cambio de schema.

Solución:
```bash
npx prisma generate
# o dentro de Docker:
docker-compose exec api npx prisma generate
```

### Error: `The table 'X' does not exist`

Causa: La migración no se aplicó a la base de datos.

Solución:
```bash
# Ver estado de migraciones
npx prisma migrate status

# Aplicar migraciones pendientes
docker exec -i postgres psql -U postgres -d gymbro < api/prisma/migrations/mi_migracion.sql
```

### Error: `Invalid value for argument` en operaciones Prisma

Causa: Los tipos del código no matchean con el schema. Puede pasar cuando se renombró un campo en el schema pero el código sigue usando el nombre viejo.

Solución: Buscar y actualizar las referencias en el código:
```bash
# Buscar referencias al nombre viejo
grep -r "paymentId\|prisma\.payment\|cartId" api/src/
```

### Verificar que el cliente generado tiene el modelo correcto

```bash
grep "model TransactionItem" node_modules/.prisma/client/index.d.ts
```

Si no encuentra nada, `prisma generate` no corrió o el output está en otro lugar.

---

## Links

- [Documentación oficial de Prisma](https://www.prisma.io/docs)
- [Prisma Client API](https://www.prisma.io/docs/reference/api-reference/prisma-client-reference)
- [Migraciones](https://www.prisma.io/docs/guides/database/develop-with-prisma-migrate)
