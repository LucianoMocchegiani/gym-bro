# Wallet local (Isar) — app afiliado

**Fecha:** 2026-08-31  
**Estado:** viva (workaround AGP 8 en el build Android)

Isar es el **disco local de la wallet de credenciales** en el celular. No es un servicio de GymBro ni de Kuatia.

Producto / protocolos: [12-acceso-quark-oid4-diseno.md](../12-acceso-quark-oid4-diseno.md).  
Package holder: `identity_core_dart/` (clon local; [15-kuatia-deuda-rename.md](../15-kuatia-deuda-rename.md)).

---

## Qué guarda cada capa

En el device hay dos piezas de identidad, en lados distintos:

| Pieza | Dónde | Qué es |
|-------|--------|--------|
| Secreto de la wallet | Keystore / Keychain (`flutter_secure_storage`) | Candado. Random, device-bound. No se sube al backend ni se deriva del password GymBro. |
| Credenciales (VCs) | **Isar** (vía `identity_core_dart`) | Pack / staff / etc. aceptadas. Sirven para listarlas en Acceso y presentarlas en la puerta (OID4VP). |

`MemberWalletService` (`mobile/lib/features/credentials/member_wallet_service.dart`) solo orquesta: unlock/create con el secreto, y el SDK persiste las VCs en Isar (`credentialStore`).

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

## Por qué se rompe el build Android

`identity_core_dart` depende de `isar` + `isar_flutter_libs` **3.1.0** (paquete abandonado; el `build.gradle` del plugin **no declara `namespace`**).

Flutter 3.41.9 trae Android Gradle Plugin **8.11**, que **exige** `namespace`. Sin eso Gradle corta al configurar `:isar_flutter_libs` y no llega a compilar la app.

No es un fallo de FVM, del teléfono ni de `pub get`. Es incompatibilidad del plugin nativo de Isar 3.1 con AGP 8.

**No** editar el pub-cache (`…/isar_flutter_libs-3.1.0+1/android/build.gradle`): se pierde al limpiar el cache.

### Workaround actual

En `mobile/android/build.gradle.kts` se inyecta `namespace` a librerías Android que no lo traen. El modelo de wallet no cambia; solo permite **construir** el plugin viejo.

El riesgo a futuro es de **mantenimiento**: cada subida de Flutter/AGP puede volver a romper el plugin. Arreglo de fondo (no hecho): fork `isar_community`, o el SDK oficial de Kuatia cuando reemplace a `identity_core_dart`.

---

## Correr mobile (FVM)

GymBro pinnea Flutter **3.41.9** (Dart 3.11.5) en `.fvmrc`. No hay SDK global: usar `fvm flutter`.

```powershell
cd mobile
fvm flutter pub get
adb devices
fvm flutter run -d <deviceId>
```

Requisito: clon `identity_core_dart/` en la raíz del monorepo.

---

[Índice](../00-indice.md) · [Diseño acceso OID4](../12-acceso-quark-oid4-diseno.md) · [Deuda Kuatia / SDK](../15-kuatia-deuda-rename.md)
