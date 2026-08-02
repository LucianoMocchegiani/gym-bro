# Acceso Quark / OID4 — diseño GymBro

**Estado:** Cerrado (diseño) — implementación pendiente  
**Fecha:** 2026-08-02  
**Contexto:** Stub actual (`ACCESS_PROVIDER=stub`) sigue en producción MVP; este doc fija el camino a QuarkID (OID4VCI/OID4VP + Credo multi-tenant).

**Repos de referencia (clon local):** `ssi-quark/` (`quark-issuer-service`, `quark-verifier-service`, `quarkid-identity-core`, `quarkid-identity-core-dart`, `quark-wallet`).

---

## 1. Decisiones cerradas

| Tema | Decisión |
|------|----------|
| Protocolo | **OpenID4**: OID4VCI (emisión) + OID4VP (presentación en puerta) |
| Por gym (Super crea tenant) | Crear **1 issuer** + **1 verifier** Quark (wallets Credo multi-tenant) |
| Por pack | Nuevo **tipo** en metadata OID4VCI del issuer (`credentialConfigurationsSupported` + `vct`) |
| Emisión de instancia | Al **pago APPROVED** (pack / renovación / drop-in según tipo) |
| Renovación online | **Offer remoto** (URI in-app / deep link / push luego); usuario **Acepta** (1 tap), sin escanear QR |
| Celu perdido / sin batería | Misma cuenta GymBro; recepción **reemite** VC del pack vigente (revoca la anterior vía StatusList) |
| Wallet en GymBro app | `identity_core_dart` (no copiar UX completa de `quark-wallet`) |
| Cuenta afiliado | Email + password (API GymBro), como hoy |
| Candado SSI local | **Secreto random invisible** en Keystore/Keychain + biometría opcional; el usuario **no** elige ni memoriza PIN |
| Cambio de dispositivo | Nueva wallet local + reemitir VCs; sin backup/recovery Quark en MVP Quark |
| Reingreso en sesión | Regla de **dominio GymBro** post-verify (ventana horaria); no “usos” mutables solo en la VC |
| Prioridad sesión vs libre (~20 min) | GymBro arma el **OID4VP request** (o evalúa claims) según hora; una presentación, sin wallet multi-elección manual |
| Stub actual | Se mantiene hasta cablear adapter Quark; mismo puerto `AccessIdentityProvider` evoluciona |

---

## 2. Mapa GymBro ↔ Quark

```text
Super: POST /tenants (GymBro)
  → Quark POST /issuers   (walletId = gymbro-iss-{slug})
  → Quark POST /verifiers (walletId = gymbro-ver-{slug})
  → Guardar IDs/DIDs en config del tenant GymBro

Admin: create/update Pack
  → Quark PATCH issuer …/metadata
      credentialConfigurationsSupported[pack_{packId}] = { vct, display, … }

Pago APPROVED / reemitir staff
  → (opcional) revocar StatusList de VC previa del mismo pack
  → Quark POST …/openid4vc/offer (configurationId, claims, exp)
  → Persistir offer pendiente en GymBro (memberId, offerUri, packId)
  → App: bandeja “Aceptar credencial” → OID4VCI pre-authorized

Puerta (afiliado escanea local o gym escanea)
  → Verifier OID4VP request (DCQL/PEX filtrando vct del gym)
  → Wallet presenta
  → GymBro: IntentoIngreso + reglas (tolerancia, reingreso sesión, multi-ingreso)
```

### Claims mínimos sugeridos (instancia VC)

- `memberId` (GymBro)
- `tenantId` / slug
- `packId` (si aplica)
- `validFrom` / `validUntil` (ciclo de facturación)
- opcional `graceUntil` (tolerancia) **o** re-emisión de VC corta de gracia

La **evaluación fina** (deuda real, cupo sesión, reingreso) puede seguir en GymBro usando estos claims + DB.

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
2. **Pack → configuration** en metadata issuer.  
3. **Offer al pago** + bandeja “Aceptar” en app (con `identity_core_dart`).  
4. **Puerta OID4VP** vía verifier del gym (reemplazo gradual del stub).  
5. Push remoto de offers (E8).  
6. Afinar tolerancia/reingreso en evaluate GymBro.

Hasta (4), el stub y el QR `stub-venue` siguen válidos para demos.

---

## 6. Relación con docs previos

- [01-documento-maestro.md](./01-documento-maestro.md) § acceso: MVP recomendaba vínculo (B); **Quark pack-typed** es la evolución acordada (2026-08-02).  
- [06-arquitectura.md](./06-arquitectura.md) §6: puerto se mantiene; adapter Quark + este diseño.  
- [99-backlog-post-mvp.md](./99-backlog-post-mvp.md): “credencial por pack” deja de ser solo idea; pasa a **plan Quark**.  
- Stub E6 implementado hoy no se apaga en este documento.

---

## 7. Abierto (no bloquea el diseño)

- `vct` naming exacto (`urn:gymbro:pack:{id}` vs corto).  
- ¿Drop-in comparte configuration genérica o tipo propio?  
- Tolerancia: claim `graceUntil` vs segunda VC.  
- Hosting Quark (issuer/verifier) en el mismo compose vs servicios externos del trabajo.

---

[Índice](./00-indice.md) · [Arquitectura](./06-arquitectura.md) · [Acceso CU](./05-casos-de-uso/acceso-qr.md)
