# Probar avisos (N1)

Lista corta de **qué se envía, cuándo y quién lo ve**. No es la bandeja de staff (no existe).

**Socio:** app → Inicio → **Avisos** (bandeja). Mail: Ajustes → **Avisos**. Con `MAIL_DRIVER=stub` el mail no llega a un buzón.

**Dueño del gym:** mail de la **Identity** dueña. No aparece en la app del socio ni en **Sistema → Avisos** del panel (esa pantalla solo edita plantillas del socio).

El cron de vencimientos corre a las **12:00** `America/Argentina/Buenos_Aires`. Un aviso por contrato (no se repite todos los días).

---

## Socio

| Aviso | Cuándo se activa | Cómo probar | Quién lo ve |
|--------|------------------|-------------|-------------|
| Pago acreditado | Caja efectivo o MP APPROVED | Cobro CASH | Socio, Avisos |
| Reserva confirmada | Reserva crédito OK | Reservar una clase | Socio |
| Reserva cancelada | Se cancela esa reserva | Cancelar | Socio |
| Lugar en lista de espera | Sale de waitlist (auto) | Clase llena → espera → se libera cupo | Socio |
| Devolución | Staff ejecuta el refund | Cierre / solicitudes | Socio |
| Pack por vencer (caja) | Cron, MONTHLY en ≤7 días, **sin** débito | Pack que vence esta semana, sin mandato | Socio |
| Pack por vencer (débito) | Cron, **con** mandato MP | Igual, con débito | Socio |
| Pack vencido (tolerancia) | Cron, vencido dentro de tolerancia del gym | `endsAt` pasado, en ventana de deuda | Socio |
| Débito: cobro no acreditado | Webhook MP rejected/cancelled de un cobro | Rechazo / sin fondos | Socio |
| Débito: mandato fallido | Preapproval cancelled/paused/rejected | Baja o rechazo del mandato en MP | Socio |

---

## Dueño del gym (plan Faciliter)

| Aviso | Cuándo se activa | Cómo probar | Quién lo ve |
|--------|------------------|-------------|-------------|
| Plan Faciliter acreditado | Caja de **admin** cobra pack al gym, o débito MP **después** del alta | Caja plataforma → gym | Identity dueña (mail) |
| Plan por vencer (caja) | Cron, `TENANT` ≤7 días, **sin** preapproval de signup | Plan a mano / efectivo | Dueño |
| Plan por vencer (débito) | Cron, hay preapproval de alta | Signup con débito | Dueño |
| Plan en gracia | Cron, vencido y ≤3 días de gracia | `endsAt` recién pasado | Dueño |
| Cobro Faciliter no acreditado | MP rejected en el débito de plataforma | Rechazo de tesorería MP | Dueño |
| Débito Faciliter detenido | Preapproval de plataforma caído | Cancelar/pausar en MP | Dueño |

Staff del local **no** tiene bandeja. No le llegan estos mails al entrenador: van al dueño (`ownerIdentity`).
