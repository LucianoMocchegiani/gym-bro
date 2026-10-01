# Gastos del gym (etiquetas, comprobantes) y Cierre efectivo/digital

**Fecha:** 2026-10-01
**Roadmap:** Post-MVP — Pagos y caja: gastos operativos
**Commit:** `b84c9eb` — feat: gastos del gym con etiquetas, comprobantes y cierre por efectivo/digital
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/b84c9eb

## Resumen

El staff carga lo que paga el gym en **Gastos** (`/gastos`): fecha, monto, Fijo/Variable, medio, etiqueta del gym, nota y hasta 5 comprobantes en R2 privado. Reportes muestra gastos y resultado (ingresos − devoluciones − gastos). El **efectivo esperado** del Cierre pasa a contar solo efectivo (antes sumaba MP) y resta los gastos en efectivo; al lado, un **digital esperado** informativo y el neto del día.

## Cambios principales

- Prisma: `expense_labels`, `expenses`, `expense_files`, enums `ExpenseNature` / `ExpenseMethod` (migración `20261001200000_expenses`).
- API módulo `expenses`: etiquetas (archivar si tienen gastos), CRUD de gastos, comprobantes, `GET /expenses/summary`; auditoría `expense.*`.
- Permisos `expenses.read` / `expenses.write`; el catálogo se sincroniza al arrancar (Admin los recibe solo).
- `payment-register/day`: `cash` y `digital` `{ income, outcome, expenses, expected }`; el arqueo guarda `cash.expected`.
- Web: pantalla Gastos, panel en Reportes, tarjetas del Cierre (gastos, efectivo y digital esperado); el declarado no propone negativos.
- MCP: `nav-map` `/gastos`, topic `gastos`, `get_cash_day` con `digital`. Postman carpeta Expenses.
- MCP (commit `b9a750e`): tools de lectura `get_expenses_summary` y `list_expenses` (`expenses.read`; etiqueta por nombre).

## Decisiones

- Gastos en tablas propias, no en `cash_movements` (FK a ítem de cobro obligatoria).
- Mercadería = una etiqueta más; naturaleza solo FIXED / VARIABLE.
- Día con arqueo cerrado: gastos en efectivo no se editan, borran ni mueven; comprobantes sí.
- Sin recurrencia ni tope de R2 en v1 (backlog).

## Validación

- `tsc` API / web / MCP; ESLint de lo nuevo (quedan errores previos en `arqueo` y `PersonFolderModal`).
- Docker `up --build api web mcp`: migración aplicada; `/gastos`, `/arqueo`, `/reportes` 200.
- Smoke por API (27 chequeos): permisos, 409 de etiqueta/cierre, tope de 5 comprobantes, efectivo vs digital esperado, auditoría. Datos borrados.
- `npm run smoke` del MCP: 19 tools; gastos OK con Admin, "No hay permiso" con Entrenador; filtro por etiqueta probado con datos reales.

## Referencias

- RN-GAS-001..006, RN-PAG-007 ([04](../04-reglas-de-negocio.md)); CU-PAG-003 / CU-PAG-012 ([pagos-caja](../05-casos-de-uso/pagos-caja.md)); [09 §4.15k](../09-esquema-db.md).
- Commit: `b84c9eb` / https://github.com/LucianoMocchegiani/gym-bro/commit/b84c9eb
- Tools MCP: `b9a750e` / https://github.com/LucianoMocchegiani/gym-bro/commit/b9a750e
