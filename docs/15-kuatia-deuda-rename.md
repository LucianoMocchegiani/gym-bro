# Kuatia — deuda de rename / SDK (pendiente)

**Fecha:** 2026-08-13  
**Estado:** parcial — runtime ya usa Kuatia compartido; limpieza de nombres/provision hecha en API.

## Hecho en esta pasada

- Módulo Nest `api/src/kuatia/` (antes `quark/`)
- Eliminado bind por tenant (`tenants.quark_*`, `POST …/quark/provision`, UI Super “Reintentar Quark”)
- Packs: columnas `kuatia_*` (sync metadata soft-fail)
- Wallets solo desde env `KUATIA_*` (provision en [consola Kuatia](https://kuatia.xyz/docs))
- Package Dart en raíz: `identity_core_dart/` (antes `ssi-quark/quarkid-identity-core-dart`). Persistencia local de VCs: [mobile/isar-wallet.md](./mobile/isar-wallet.md).

## Dejar para más adelante

1. **SDK Kuatia oficial** — cuando el equipo lo publique; hoy se mantiene `identity_core_dart` (integración actual).
2. **Docs producto históricos** — `docs/12-acceso-quark-oid4-diseno.md`, tareas-terminadas y menciones “Quark” en glosario/wireframes: no reescritos en masa.
3. **UI Admin** de sync pack (`kuatiaSyncedAt` / `kuatiaLastError`) — thin gap E10.
4. **Naming residual** — `QuarkPublicConfig` en mobile, rutas/comentarios legacy, audit events viejos `tenant.quark.provision` en DB histórica.

## Modelo operativo

```text
Consola Kuatia → 1 issuer + 1 verifier (producto GymBro)
       ↓
api/.env  KUATIA_*_BASE_URL / API_KEY / WALLET_ID
       ↓
Offers OID4VCI + pack metadata + OID4VP puerta
       ↓
claims tenantId / packId (multi-gym sobre mismo issuer)
```
