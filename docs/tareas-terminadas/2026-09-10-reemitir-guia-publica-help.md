# Re-emitir credencial vigente, guía pública y ayuda de vistas

**Fecha:** 2026-09-10
**Roadmap:** acceso / cobros + P3 landing
**Commit:** `416425b` — feat: re-emitir pack vigente, guia publica y ayuda de vistas
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/416425bbb8fe7781a110d642a5dd9e3067c1192e

## Resumen

Re-emitir genera un offer del **contrato vigente hoy**, sin cobro ni mes extra. No se crean cobros `STUB` nuevos. La landing publica la guía de uso en `/docs` (capturas reales, lightbox). El asistente (landing y Admin) describe las pantallas con `get_help` topic `guia`; las fotos quedan para otro corte (visión).

## Cambios principales

- `POST /members/:id/credential-offers`; panel Re-emitir deja de hacer `POST /contracts` con STUB.
- Alta de contrato / drop-in: STUB nuevo → 400. Caja CASH o Mercado Pago.
- Script `prisma:purge-stub` (corrida en gym-de-prueba).
- Sitio `/docs` + playbook `docs/uso/`; parser sin notas `§`.
- `mcp/help/guia.md` + prompts del chat.

## Decisiones

- Re-emitir = pack que cubre hoy (si hay varios, el `startsAt` más nuevo).
- `PaymentMethod.STUB` queda en Prisma como legado.
- El chat no recibe PNG (ticket Faciliter-2 / backlog Admin).

## Validación

- Re-emitir: offer PENDING del pack de hoy, sin mes extra.
- `/docs/que-es` y `/docs/modulos`: tablas, listas, miniaturas con ×.
- STUB `POST /contracts` → 400. Purge ya corrido en demo.

## Referencias

- CU-AFI-006, RN-PAG-002, RN-ACC-002
- [uso/guia-web-y-app.md](../uso/guia-web-y-app.md)
- Commit: `416425b` / https://github.com/LucianoMocchegiani/gym-bro/commit/416425bbb8fe7781a110d642a5dd9e3067c1192e
