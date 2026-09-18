# Wallet de dispositivo y AppSession

**Fecha:** 2026-09-18
**Roadmap:** preparación app staff (misma wallet / sesión GymBro)
**Commit:** `a02dc8d` — feat(mobile): DeviceWallet and AppSession shared by profile
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/a02dc8d0986455bc3f620adbb5ee3d05a8abd8f1

## Resumen

La wallet local y la sesión persistida dejan de ser “solo afiliado”. `DeviceWalletService` usa ids `faciliter-device` / `faciliter.wallet.secret`. `AppSession` guarda `profileType` (MEMBER o STAFF) en `faciliter.app.session`. El login sigue siendo afiliado.

## Cambios principales

- Rename `MemberWalletService` → `DeviceWalletService`
- `AppSession` + clave de storage nueva; `MemberSession` del calendario intacto
- Doc `docs/mobile/isar-wallet.md`

## Decisiones

- Misma wallet del dispositivo para ambos perfiles; no hay clientes en producción, ids nuevos sin migración
- Login staff y shell de staff quedan para el siguiente corte

## Validación

- `fvm flutter analyze` (auth, credentials, main, settings, access): sin issues
- Prueba en device: re-login afiliado, reaceptar offers, Acceso y Ajustes

## Referencias

- RN-ROL-005
- [isar-wallet.md](../mobile/isar-wallet.md)
- Commit: `a02dc8d` / https://github.com/LucianoMocchegiani/gym-bro/commit/a02dc8d0986455bc3f620adbb5ee3d05a8abd8f1
