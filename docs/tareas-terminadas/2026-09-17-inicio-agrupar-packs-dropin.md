# Inicio agrupa packs y oculta drop-in usado

**Fecha:** 2026-09-17
**Roadmap:** E9 — Home / estado de cuenta (CU-AFI-005)
**Commit:** `7d6994c` — feat(mobile): group home packs by packId and hide spent drop-in
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/7d6994cf01a713b01a5e76bf72fe7521b87038d9

## Resumen

Inicio muestra una card por pack vigente hoy: créditos ONE_TIME del mismo pack se suman. Si no hay acceso libre y el saldo es 0 (clase suelta ya tomada), la card no aparece. El contrato en API no se cierra.

## Cambios principales

- `homePackGroups` + `GET /me/account?coverage=current`
- Cards de Inicio leen `homePacks`

## Decisiones

- Agrupar por `packId`; “Hasta” = `endsAt` más lejano del grupo
- Ocultar saldo 0, no expirar el contrato

## Validación

- `dart analyze` de los archivos tocados
- Prueba en dispositivo: drop-in apilado vs mensual; card suelta desaparece al gastar créditos

## Referencias

- CU-AFI-005
- Commit: `7d6994c` / https://github.com/LucianoMocchegiani/gym-bro/commit/7d6994cf01a713b01a5e76bf72fe7521b87038d9
