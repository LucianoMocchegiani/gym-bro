# Wallet local (Isar) — app móvil

**Fecha:** 2026-08-31 · actualizado 2026-10-01 (`isar_community`)  
**Estado:** viva

Isar es el **disco local de la wallet de credenciales** en el celular. No es un servicio de GymBro ni de Kuatia.

Producto / protocolos: [12-acceso-quark-oid4-diseno.md](../12-acceso-quark-oid4-diseno.md).  
Package holder: `identity-core-dart/` (en el monorepo; [15-kuatia-deuda-rename.md](../15-kuatia-deuda-rename.md)).

---

## Qué guarda cada capa

En el device hay dos piezas de identidad, en lados distintos:

| Pieza | Dónde | Qué es |
|-------|--------|--------|
| Secreto de la wallet | Keystore / Keychain (`faciliter.wallet.secret`) | Candado. Random, device-bound. No se sube al backend ni se deriva del password GymBro. |
| Credenciales (VCs) | **Isar** (`walletId` `faciliter-device`, vía `identity_core_dart`) | Pack / staff / etc. aceptadas. Sirven para listarlas en Acceso y presentarlas en la puerta (OID4VP). |

`DeviceWalletService` (`mobile/lib/features/credentials/device_wallet_service.dart`) solo orquesta: unlock/create con el secreto, y el SDK persiste las VCs en Isar (`credentialStore`). Afiliado y staff usan la misma wallet del dispositivo.

La API GymBro **no** guarda el contenido de la wallet. Persiste offers, contratos y el resultado del verify. Kuatia **emite**; el celular **guarda y presenta**.

```text
Kuatia emite offer
    → afiliado Acepta (bandeja o QR)
    → identity_core_dart materializa la VC
    → Isar la persiste en el device
    → puerta OID4VP: el SDK lee Isar y presenta
```

---

## Qué implica en producto (MVP)

- Celular nuevo, app reinstalada o **Reiniciar wallet** = Isar vacío. Hay que **reemitir** las VCs vigentes (staff). No hay backup/recovery de esa base.
- Sin Isar no hay credenciales en el dispositivo: la bandeja no materializa VCs y el QR de ingreso no tiene qué presentar.
- Login GymBro (email/password + JWT) **no** usa Isar.

---

## Versiones y build Android

`identity_core_dart` usa **`isar_community` 3.3.2**, el fork mantenido de Isar 3 (mismo API). Reemplazó a `isar` 3.1 (2026-10-01) porque el original estaba abandonado:

- no declaraba `namespace` (AGP 8 corta el build);
- compilaba con SDK 30 (`android:attr/lStar not found` en release);
- `libisar.so` venía alineada a 4 KB y Google Play exige 16 KB.

Con el fork, `mobile/android/build.gradle.kts` ya no necesita parches.

`sodium` / `sodium_libs` (DIDComm) están en 3.4.x por la misma regla de 16 KB. El tope `<3.4.6` es porque desde ahí piden `freezed_annotation` 3 y el paquete sigue en freezed 2.

### Regenerar los esquemas Isar

`isar_community_generator` 3.3 choca con freezed 2 (versiones de `build`), así que los `.g.dart` de Isar se generan aparte:

```powershell
cd identity-core-dart
.\tool\isar_codegen\generate.ps1
```

Los modelos de Freezed / json se siguen generando con `build_runner` en el paquete.

### Datos de wallets viejas

Cambiar de motor puede dejar sin leer una base creada con Isar 3.1. Si Acceso muestra error al abrir la wallet: Ajustes → **Reiniciar wallet** y reemitir las credenciales (no había usuarios en tienda al migrar).

---

## Correr mobile (FVM)

GymBro pinnea Flutter **3.41.9** (Dart 3.11.5) en `.fvmrc`. No hay SDK global: usar `fvm flutter`.

```powershell
cd mobile
fvm flutter pub get
adb devices
fvm flutter run -d <deviceId>
```

`identity-core-dart/` está versionado en el monorepo (path dependency de `mobile`).

---

[Índice](../00-indice.md) · [Diseño acceso OID4](../12-acceso-quark-oid4-diseno.md) · [Deuda Kuatia / SDK](../15-kuatia-deuda-rename.md)
