# Vencimientos

Cola de recepción: packs **mensuales** que vencen en 7 días o ya vencieron y siguen en tolerancia de deuda. No es un reporte de plata.

Pantalla Admin: **Vencimientos** (`/dashboard/vencimientos`), en Operación al lado de Caja. Filtros: días, tolerancia, débito (Mercado Pago cobra), a mano (renovar en Caja). Por socio: pack, vencimiento, plazo y cómo paga. Acciones: Ficha, Caja, Débitos.

La pantalla no manda nada: sirve para que recepción llame o cobre a tiempo. Los mails al socio (pack por vencer, pack vencido) los manda el sistema solo, según Sistema → **Avisos** (topic `avisos`).

Hace falta ver afiliados (`members.read`). Cobrar pide permiso de caja.
