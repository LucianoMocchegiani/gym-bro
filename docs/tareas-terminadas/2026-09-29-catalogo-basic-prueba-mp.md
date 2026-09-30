# Catálogo Brain (60k / 100), guía MP y pulido Admin

**Fecha:** 2026-09-29
**Roadmap:** plataforma / cobros Faciliter
**Commit:** `b07400b` — feat(platform): pack Basic 60000, plan de prueba 100 y guía MP
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/b07400bf8889bae4ad34b119a060138588de1f4c

## Resumen

El tenant `admin` vende **Faciliter Brain Basic** a 60000 ARS y un pack **de prueba** a 100 ARS (mismo alcance). Hay guía de Mercado Pago por gym (webhooks con `tenantId`), topic MCP `mercadopago`, y ajustes de scrollbar/contraste en el panel.

## Cambios principales

- Seed + `prisma:upsert-platform-packs` (ids `…011` y `…016`)
- Docs de uso MP, índice, credenciales demo, Postman
- MCP: artículo y alias `mp`
- Admin: `--on-danger`, pills de calendario, scrollbars de tablas/tabs/semana

## Decisiones

- El script acotado evita re-seed completo en VPS
- Precio nuevo aplica a ventas nuevas, no reprecifica contratos ya cobrados

## Validación

- Código y docs alineados; aplicar packs en VPS con `docker compose exec api npm run prisma:upsert-platform-packs`
- Guía MP y CSS a cargo de prueba en VPS/usuario

## Referencias

- `docs/uso/configurar-mercadopago-tenant.md`
- `docs/credenciales-demo.md`
- Commit: `b07400b` / https://github.com/LucianoMocchegiani/gym-bro/commit/b07400bf8889bae4ad34b119a060138588de1f4c
