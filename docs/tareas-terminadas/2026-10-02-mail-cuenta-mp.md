# Mail de la cuenta Mercado Pago en el alta del gym y el débito de Caja

**Fecha:** 2026-10-02
**Commit:** `b51d1da` — fix(mp): pedir el mail de la cuenta Mercado Pago en el alta del gym y el debito de Caja
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/b51d1da95ce284d24f0e9784356d923f9a440ba0

## Resumen

En producción, el checkout de MP decía «tu email no coincide con el de la suscripción»: el `preapproval` se creaba con el mail de la cuenta Faciliter (o del socio) y MP solo deja autorizarlo a la cuenta logueada con ese `payer_email`. Ahora `/empezar` y Caja piden el mail de la cuenta MP que va a autorizar.

## Cambios principales

- API: `payerEmail` opcional en el alta self-serve, el alta de débito y el cambio de pack. Vacío = mail de la cuenta Faciliter o del afiliado.
- Columna `debit_mandates.mp_payer_email` (migración `20261002220000`): Regenerar link y Próximo pack reusan el mail guardado; `payerEmail` en el detalle del mandato.
- Web: campo en `/empezar` (precargado con el mail de la sesión), en el cobro de Caja con tilde de débito y en la pestaña Débitos.
- Docs: RN-PAG-013, CU-PAG-008/010, esquema, P9k, guía `/docs`, help `debito` / `plan`, Postman; se corrigió «plan + preapproval» en `01` y `09`.

## Decisiones

- Se descartó el link del plan (que paga cualquier cuenta MP) para no reintroducir planes.
- En el alta self-serve el mail no se guarda: cada intento crea un signup nuevo.

## Validación

- `tsc --noEmit` en `api` y `web`; eslint de los archivos tocados sin errores nuevos (los de `set-state-in-effect` son previos).
- Prueba en producción pendiente del deploy (`local/en-testeo/probar-mail-cuenta-mp.md`).

## Referencias

- `docs/04-reglas-de-negocio.md` (RN-PAG-013), `docs/05-casos-de-uso/pagos-caja.md` (CU-PAG-008/010).
- Commit: `b51d1da` / https://github.com/LucianoMocchegiani/gym-bro/commit/b51d1da95ce284d24f0e9784356d923f9a440ba0
