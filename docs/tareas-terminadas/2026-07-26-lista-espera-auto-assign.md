# Lista de espera (auto-assign)

**Fecha:** 2026-07-26  
**Roadmap:** E4 — Lista de espera (3 modos)  
**Commit:** `c88ac43` — feat(api): add session waitlist with auto-assign promotion  
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/c88ac43

## Resumen

Lista de espera FIFO por sesión: Member se une cuando la sesión está llena, lista y sin iniciar; puede listar y salir. Cuando se libera un cupo (cancelar reserva o ampliar cupo) y `waitlistMode = AUTO_ASSIGN`, el primer candidato con crédito activo se promueve automáticamente: crea reserva, descuenta crédito, marca la entry como `PROMOTED` y audita `waitlist.promote`.

## Cambios principales

- Prisma: enums `WaitlistMode`/`WaitlistStatus`, tabla `waitlist_entries`, `waitlistMode` en `tenant_settings`
- API `me/waitlist` + `members/:id/waitlist` + `sessions/:id/waitlist` (Member/Staff/Super)
- Hooks de promoción en cancelar reserva y ampliar cupo
- Audit `waitlist.join|leave|promote`; docs README / arquitectura / esquema / roadmap; Postman

## Decisiones

- MVP: solo `AUTO_ASSIGN` implementado en la promoción; `MEMBER_CONFIRM` y `STAFF_CONFIRM` quedan configurables pero al backlog post-MVP
- No se promueve a quien ya tiene reserva o no tiene crédito activo (se salta al siguiente)
- Unicidad de entradas `WAITING` por `(sessionId, memberId)`

## Validación

- migrate + lint/build OK
- Prueba: Member en lista de espera → al cancelar otra reserva se promueve (entry `PROMOTED`, nueva reserva, `bookedCount` consistente)

## Referencias

- CU-RES-004, RN-RES-004; backlog: modos MEMBER_CONFIRM / STAFF_CONFIRM
- Commit: https://github.com/LucianoMocchegiani/gym-bro/commit/c88ac43
