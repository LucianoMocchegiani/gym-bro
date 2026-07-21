# Postman — GymBro API

## Importar (importante)

1. **Import** → `GymBro.api.postman_collection.json` + `GymBro.local.postman_environment.json`
2. Arriba a la derecha elegí environment **GymBro Local** (si no, `{{accessToken}}` no se reemplaza).
3. Si ya habías importado antes: borrá la colección/env viejos e importá de nuevo, o Sync variables del environment.

## Credenciales seed (en el environment)

| Perfil | Email | Password | Extra |
|--------|-------|----------|--------|
| Super | `super@gymbro.local` | `ChangeMe123!` | — |
| Staff | `admin@demo.gym` | `ChangeMe123!` | `tenantId` |
| Member | `socio@demo.gym` | `ChangeMe123!` | `tenantId` |

Variables: `superEmail` / `superPassword`, `staffEmail` / `staffPassword`, `memberEmail` / `memberPassword`.

## Secuencia automática (Collection Runner)

1. Clic derecho en **Auth flow (Collection Runner)** → **Run folder**.
2. Run: Login Super → Me → Refresh → Me → Logout.
3. Los scripts guardan `accessToken`, `refreshToken`, `profileType`, `userId`, `userEmail` en **environment + collection**.

## Manual

Carpeta **Auth (manual)**: Login Super/Staff/Member → Me → Refresh → Logout.

Carpeta **Roles** / **Staff roles**: Staff necesita permisos (`roles.write` para list/get/create/patch, `staff.write` para asignar). El Admin seed los tiene; un rol sin esos códigos → 403.

Carpeta **Audit**: `GET /audit-events` (Staff, `audit.read`) o Super por tenant. Generá eventos con mutaciones de tenant/roles/staff roles.

## Multi-tenant

- `GET /auth/me` → `tenantId` para staff/member (del JWT).
- Rutas de negocio futuras: `@RequireTenantAuth()` (Super → 403).
- Rutas plataforma: `@RequireSuperAuth()` — `/api/tenants` (staff/member → 403).
- Tenant suspendido: se corta en login/refresh, no en cada request.
