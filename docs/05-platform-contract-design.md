# Faciliter Brain — Contrato de Tenant

## Arquitectura

El tenant `admin` es un tenant más. Su **inicio** muestra KPIs (tenants activos, caja del día, tenants sin pack Faciliter). Lista e impersonar: `/tenants`. Caja, vencimientos, cierre, devoluciones, reportes: igual que cualquier tenant. Oculta: Puertas, Sesiones.

## Flujo de pago de tenant

```
1. Admin selecciona PlatformPack (ej: "Monthly")
   → mismo Pack/Service de hoy (ACCESO_LIBRE, etc.)

2. Admin paga (MP o efectivo)
   → TransactionItem APPROVED

3. ContractsService.createFromTransactionItem()
   → Contract ACTIVE
   → contractType: TENANT, tenantId + packId + transactionItemId

4. KuatiaOfferService.ensureOfferForContract()
   → CredentialOffer OID4VCI
   → Admin acepta → credencial SSI platform

5. Admin accede a Faciliter Brain
   → Checkea contrato ACTIVE del pack platform
```

## Modelo Contract

```
Contract {
  ...campos actuales,
  contractType: MEMBER | TENANT,
  tenantId?: String (nullable, exclusivo con memberId)
}
```

- `MEMBER` → hoy, memberId set, tenantId null
- `TENANT` → nuevo, tenantId set, memberId null

## Reutilización

| Modelo | Uso actual | Uso platform |
|---|---|---|
| Pack | Gym packs | Platform packs |
| Service | Gym services | Platform services |
| Contract | memberId + packId | tenantId + packId |
| TransactionItem | member payment | tenant payment |
| CredentialOffer | member wallet | tenant wallet |

## Guard rails

- Tenant contract → no puertas, no sesiones
- Member contract → puertas, sesiones, caja
- Access-verify: chequea `contractType` + `ServiceType`
- Kuatia: claims diferentes para platform credential

## Nuevos endpoints

```
GET /tenants/platform
Auth: staff de tenant 'admin' (PlatformTenantGuard)
Response: TenantSummary[]
```

## Permisos nuevos

```
platform.tenants.read   → lista tenants
platform.tenants.write  → CRUD tenants
platform.impersonate    → impersonar staff de cualquier tenant
```

## Seed

```
Tenant: { slug: 'admin', name: 'Faciliter Admin' }
StaffUser: { email: 'admin@faciliter.xyz', tenantId: admin-tenant }
Role: 'super-admin'
Pack seed: Faciliter Brain Basic (60000) + Faciliter Brain Basic de prueba (100) + servicios (Plataforma Brain, Agente de IA, …)
Landing: GET /public/platform/packs
```
