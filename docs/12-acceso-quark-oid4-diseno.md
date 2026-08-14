# Acceso Quark / OID4 — diseño GymBro

**Estado:** Migración a **Kuatia** en curso (issuer/verifier compartidos; Compose sin Quark local)  
**Fecha:** 2026-08-02 (actualizado 2026-08-12)  
**Contexto:** Acceso en puerta vía OpenID4 (OID4VCI emisión + OID4VP presentación). Stubs de vínculo retirados. Transporte: [Kuatia](https://kuatia.xyz/docs).

**Repos Flutter:** `ssi-quark/quarkid-identity-core-dart` (gitignore). Issuer/verifier = Kuatia en dominio.

---

## 1. Decisiones cerradas

| Tema | Decisión |
|------|----------|
| Protocolo | **OpenID4**: OID4VCI (emisión) + OID4VP (presentación en puerta) |
| Proveedor | **Kuatia** (1 producto GymBro; auth `x-api-key`) |
| Por gym (Super crea tenant) | **No** crear issuer/verifier; solo DB GymBro + bind de wallet IDs compartidos |
| Issuer / verifier | **1 + 1 compartidos** para todos los gyms; distinción por claims (`tenantId`, `packId`) |
| Por pack | Nuevo **tipo** en metadata OID4VCI del issuer compartido (`credentialConfigurationsSupported` + `vct`) |
| Emisión de instancia | Al **pago APPROVED** (pack / renovación / drop-in según tipo) |
| Renovación online | **Offer remoto** (URI in-app / deep link / push luego); usuario **Acepta** (1 tap), sin escanear QR |
| Celu perdido / sin batería | Misma cuenta GymBro; recepción **reemite** VC del pack vigente (revoca la anterior vía StatusList) |
| Wallet en GymBro app | `identity_core_dart` (no copiar UX completa de `quark-wallet`) |
| Cuenta afiliado | Email + password (API GymBro), como hoy |
| Candado SSI local | **Secreto random invisible** en Keystore/Keychain + biometría opcional; el usuario **no** elige ni memoriza PIN |
| Cambio de dispositivo | Nueva wallet local + reemitir VCs; sin backup/recovery en MVP |
| Reingreso en sesión | Regla de **dominio GymBro** post-verify (ventana horaria); no “usos” mutables solo en la VC |
| Prioridad sesión vs libre (~20 min) | GymBro arma el **OID4VP request** (o evalúa claims) según hora; una presentación, sin wallet multi-elección manual |
| Stub histórico | Retirado; puerta = OID4VP |

---

## 2. Mapa GymBro ↔ Kuatia

```text
Super: POST /tenants (GymBro)
  → Solo DB GymBro
  → Bind KUATIA_ISSUER_WALLET_ID / KUATIA_VERIFIER_WALLET_ID en tenant.quark_*

Admin: create/update Pack
  → Kuatia PATCH issuer …/metadata (x-api-key)
      credentialConfigurationsSupported[pack_{packId}] = { vct, display, … }

Pago APPROVED / reemitir staff
  → (opcional) revocar StatusList de VC previa del mismo pack
  → Kuatia POST …/openid4vc/offer (configurationId, claims, exp)
  → Persistir offer pendiente en GymBro (memberId, offerUri, packId)
  → App: bandeja “Aceptar credencial” → OID4VCI pre-authorized

Puerta (afiliado escanea local o gym escanea)
  → Verifier OID4VP request (DCQL/PEX filtrando vct del gym)

  → Wallet presenta
  → GymBro: IntentoIngreso + reglas (tolerancia, reingreso sesión, multi-ingreso)
```

### Claims mínimos sugeridos (instancia VC afiliado)

- `memberId`, `memberName`
- `tenantId`, `tenantName`
- `packId`, `packName`
- `validFrom` / `validUntil` (ciclo del contrato)

### Claims VC staff (molinete)

- `staffId`, `staffName`, `tenantId` (+ `tenantName` opcional)
- Roles **no** van en la VC; se leen de DB al verificar (`active`)
- `configurationId` = `staff_{tenantId}`; `vct` = `urn:gymbro:staff:{tenantId}`
- Emisión Admin: `POST /staff/:id/credential-offers`; persistencia `staff_credential_offers`
- Puerta: mismo QR; DCQL OR pack|staff; reason `ok_staff` / `staff_inactivo`
- Fichaje horario: diferido (backlog)

La **evaluación fina** (deuda real, cupo sesión, reingreso) puede seguir en GymBro usando estos claims + DB (solo afiliado).

---

## 3. App afiliado — capas

```text
┌─────────────────────────────────────┐
│ Login email/password → JWT GymBro   │  cuenta
├─────────────────────────────────────┤
│ Secure storage: wallet secret       │  invisible-bound
│ (+ biometría para leer el secreto)  │
├─────────────────────────────────────┤
│ WalletService.create/unlock(secret) │  identity_core_dart
│ OID4VCI accept offer / OID4VP share │
└─────────────────────────────────────┘
```

- **No** derivar el secreto del password del server.
- **No** subir el secreto al backend.
- Primera vez en el device: tras login OK → generar secreto → `create`.
- Ofertas pendientes: `GET`-like bandeja GymBro + botón Aceptar (E8 push después).

---

## 4. Recepción — casos operativos

| Caso | Acción |
|------|--------|
| Socio sin celu / batería | Pase manual (ya existe) **o** no aplica VC |
| Socio con celu nuevo | Login → nueva wallet → Staff “Reemitir pack actual” → Aceptar offer |
| Credencial comprometida | Revocar StatusList + reemitir |
| Pack vencido sin pago | Revocar / no emitir; deny en puerta |

---

## 5. Orden de implementación

1. **[x] Spike:** Compose issuer+verifier (sin RabbitMQ) + al crear tenant GymBro → Quark + soft-fail + `POST …/quark/provision` + UI Super.  
2. **[x] Pack → configuration** en metadata issuer (`pack_{id}` / `urn:gymbro:pack:{id}`; soft-fail; `packs.quark_*`).  
3. **[x] Offer al pago** (API): al pack APPROVED → `POST …/openid4vc/offer` + tabla `credential_offers` slim + `GET /me/credential-offers` (soft-fail). Re-oferta: re-POST contrato con la misma `idempotencyKey`.  
   - Claims VC (solo en llamada Quark): `memberId`, `memberName`, `tenantId`, `tenantName`, `packId`, `packName`, `validFrom`, `validUntil`.  
   - **Bandeja Flutter:** Home lista `PENDING` + Aceptar con `identity_core_dart` (secreto device-bound). Tras ≥1 VC → `POST /me/credential-offers/:id/accept` → `ACCEPTED`. Si el issuer responde vencido/inválido → `POST …/fail` → `FAILED` (sale de bandeja; `lastError` staff). Issuer público: `https://issuer.pruebasaproduccunon.uno` (tunnel).  
   - **App nav:** Inicio · Acceso (Escanear default; Credenciales = pendientes de aceptación + VCs) · Ajustes. Sin stub en mobile.  
4. **[x] Puerta OID4VP** vía verifier del gym (`POST /access/oid4vp/request` + poll session → `memberId` → evaluate). Stubs retirados.  
5. Push remoto de offers (E8).  
6. **[x] Tolerancia en evaluate** (atraso desde `endsAt` libre + `ok_deuda_tolerancia` / `deuda_excedida`). Reingreso/ventana sesión configurable: pendiente.  
   - Renovación MONTHLY alineada: +1 día tras `endsAt` si usó tolerancia o renueva a tiempo; día de pago si no hubo ingresos en el hueco.  

Hasta (4) inclusive el stub quedó fuera de producción.

---

## 6. Relación con docs previos

- [01-documento-maestro.md](./01-documento-maestro.md) § acceso: MVP recomendaba vínculo (B); **Quark pack-typed** es la evolución acordada (2026-08-02).  
- [06-arquitectura.md](./06-arquitectura.md) §6: puerto se mantiene; adapter Quark + este diseño.  
- [99-backlog-post-mvp.md](./99-backlog-post-mvp.md): “credencial por pack” deja de ser solo idea; pasa a **plan Quark**.  
- Stub E6 histórico: reemplazado por OID4VP en puerta (paso 4).

---

## 7. Abierto (no bloquea el diseño)

- `vct` / `configurationId`: **cerrado** — `pack_{packId}` y `urn:gymbro:pack:{packId}`.  
- ¿Drop-in comparte configuration genérica o tipo propio?  
- Tolerancia en puerta: **cerrado** en GymBro (días desde `endsAt`); claim `graceUntil` / segunda VC sigue opcional.  
- Hosting issuer/verifier: **cerrado** — Kuatia en dominio (no Compose local).

**Nota:** columnas API siguen prefijo `quark_*` por compatibilidad de schema; el transporte es Kuatia.

---

[Índice](./00-indice.md) · [Arquitectura](./06-arquitectura.md) · [Acceso CU](./05-casos-de-uso/acceso-qr.md)
