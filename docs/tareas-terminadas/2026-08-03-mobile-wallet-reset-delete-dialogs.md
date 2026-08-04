# Reiniciar wallet, borrar VC y diálogos confirm/loading

**Fecha:** 2026-08-03  
**Roadmap:** App afiliado — Ajustes / Credenciales SSI  
**Commit:** `99f194a` — feat(mobile): reiniciar wallet, borrar VC y diálogos confirm/loading  
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/99f194a

## Resumen

La app permite reiniciar la wallet SSI desde Ajustes y eliminar credenciales de a una desde Acceso → Credenciales, con diálogos de confirmación y de carga reutilizables (también logout y aceptar offers). Se eliminó la carpeta Postman Auth flow Runner.

## Cambios principales

- `MemberWalletService.resetWallet` / `deleteCredential` + `ChangeNotifier`
- `showConfirmDialog` + `runWithLoadingDialog`
- UI Ajustes / Credenciales / offers
- Postman: sin `Auth flow (Collection Runner)`

## Decisiones

- Reset no hace logout; offers en API no se tocan
- Popup de carga no cancelable mientras termina la acción

## Validación

- `dart analyze` en archivos tocados: sin issues
- Flujo manual: confirm → loading → snackbar
