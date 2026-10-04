# Renovación del plan Faciliter con cada cobro de la suscripción

**Fecha:** 2026-10-04
**Roadmap:** Plan Faciliter / alta self-serve (P3)
**Commit:** `3a7b71d` — fix(platform): renovar el plan Faciliter con cada cobro de la suscripcion
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/3a7b71d

## Resumen

Los gyms dados de alta en `/empezar` pagan el plan con una suscripción de Mercado Pago, pero solo el alta creaba contrato: los cobros siguientes (y el primero después de la prueba) solo mandaban el mail «plan acreditado». El plan vencía igual y el gym caía en gracia y modo limitado aunque hubiera pagado. Ahora cada cobro aprobado renueva el plan.

## Cambios principales

- Cada cobro aprobado de la suscripción crea una Transaction **MP** aprobada en el gym (`platform-plan-mp:{id}`, `mp_payment_id` del ítem) y un contrato TENANT de un mes encadenado al anterior (RN-PAG-017). Sin movimiento de caja: es plata que el gym pagó.
- El primer cobro de un alta sin prueba usa el mismo camino: deja de figurar como efectivo en la Caja del gym.
- Idempotente por id de pago: MP avisa cada cobro por `payment` y por `subscription_authorized_payment`.
- El mail «plan acreditado» sale con `notifyPaymentApproved` (con monto), una vez por cobro registrado.
- Plan B: al abrir `/cuenta` y en el job horario, para gyms con el plan que vence en ≤ 3 días o venció hace < 30, se consultan los cobros en `authorized_payments/search` (paginado) y se aplican los que falten. Las altas sin prueba anteriores (primer cobro como cart de Caja) saltean el primer cobro.
- Puerto MP: `listApprovedAuthorizedPayments` reemplaza a `hasApprovedAuthorizedPayment`; `getAuthorizedPayment` devuelve el monto.

## Decisiones

- Pagos del plan por MP como pago MP y sin ingreso en la Caja del gym.
- Reusar el mecanismo de conciliación existente (`/cuenta` + job horario) para las renovaciones, solo en la ventana de riesgo.
- Cobro rechazado: sin cambios (aviso al dueño; vence y aplica RN-PAG-018).
- Sin gyms reales afectados: no se arreglan datos.

## Validación

- API: `tsc` y eslint de los archivos tocados OK. Sin tests automáticos del flujo.
- Prueba manual pendiente: `local/en-testeo/plan-faciliter-renovacion.md` (casos P3m–P3o de `08`).

## Pendiente

- Ventas de planes desde la Caja de `admin`: el cobro, la caja y el comprobante quedan hoy en el gym (y la venta por MP no se completa). Es la tarea siguiente.

## Referencias

- RN-PAG-017, RN-PAG-018, `08` P3m–P3o, `09` §4.15h3, guía «Contratar Faciliter», ayuda MCP `plan`.
- Commit: `3a7b71d` / https://github.com/LucianoMocchegiani/gym-bro/commit/3a7b71d
