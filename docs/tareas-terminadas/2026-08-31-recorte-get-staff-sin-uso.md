# Recorte de GET Staff no usados por el Admin

**Fecha:** 2026-08-31
**Roadmap:** higiene API (post Super delgado)
**Commit:** `e26e2a7` — feat(api): recorta GET Staff que el Admin no usa
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/e26e2a7

## Resumen

Se eliminaron 7 GET Staff que el panel no llama. Contratos y reservas próximas van por `GET /members/:id/account`; roster y waitlist por la sesión; comprobante por `GET /receipts/:id` o `GET /transactions/:id/receipt`. También se borraron los `findOne` de servicio que solo servían a esos GET.

## Cambios principales

- HTTP: `GET` contracts (lista/id), reservations (lista member/id), waitlist member, receipts member, recurrence rule by id.
- Wrappers: `listMemberReceipts` en web; `findOne` en contracts, reservations y recurrence-rules.
- Postman y docs alineados. `/me/*` del afiliado se mantiene.

## Validación

- Admin: ficha cuenta, roster, waitlist, comprobante, cancelar contrato, desactivar recurrencia.
- Postman: esos GET → 404; account/roster/receipt → 200.

## Referencias

- CU-AFI-004; `docs/06-arquitectura.md`.
- Commit: `e26e2a7` / https://github.com/LucianoMocchegiani/gym-bro/commit/e26e2a7
