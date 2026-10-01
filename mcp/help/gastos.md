# Gastos

Pantalla Admin: **Gastos** (`/gastos`). Registra lo que el gym **paga**: alquiler, luz, sueldos, compra de mercadería, etc. Un gasto no es un cobro ni una devolución.

Cada gasto tiene fecha, monto en pesos, **naturaleza** (Fijo o Variable), **medio** (Efectivo, Transferencia, Mercado Pago o Tarjeta), una **etiqueta** obligatoria y una nota opcional. Se pueden adjuntar hasta **5 comprobantes** (PDF o imagen, hasta 5 MB cada uno).

Las **etiquetas** las define cada gym (botón Etiquetas, o "Nueva etiqueta" al cargar). Si una etiqueta ya tiene gastos no se borra: se **archiva** y deja de aparecer para gastos nuevos.

Solo los gastos en **efectivo** restan en el **Cierre** (`/arqueo`): efectivo esperado = cobros en efectivo − devoluciones en efectivo − gastos en efectivo. Si el día ya tiene arqueo cerrado, sus gastos en efectivo no se editan ni se borran (sí se pueden sumar comprobantes).

En **Reportes** aparecen los gastos del período (fijos y variables, por etiqueta) y el **resultado**: ingresos − devoluciones − gastos.

No hay gastos recurrentes automáticos: cada mes se carga el gasto. El asistente puede **consultar** gastos (cuánto se gastó en un período, por etiqueta, los últimos cargados) pero **no carga** ni edita.

Permisos: `expenses.read` para ver, `expenses.write` para cargar, editar y borrar.
