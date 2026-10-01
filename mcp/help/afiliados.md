# Afiliados

El **afiliado** (socio) es quien consume los servicios y usa la **app**. No es staff.

Pantalla Admin: **Afiliados** (`/afiliados`). Ahí buscás por nombre, email o documento, abrís la ficha y ves el estado de cuenta (packs contratados, contratos, créditos, pagos).

La **credencial de puerta** se emite al cobrar el pack. **Re-emitir** (ficha del socio) no cobra: usa el pack vigente hoy. El socio acepta en la app. El asistente **no** emite ni cobra.

**Carpeta** (ícono en la grilla): notas y PDF/imagen (rutina, estudios, etc.). Etiquetas las define el gym. El socio las ve en la app → Inicio → Documentos. Cómo usarla: `get_help` topic `carpeta`. El asistente **no** sube archivos.

El alta, la baja y la edición son en esa pantalla. El asistente puede buscar y resumir la cuenta, pero **no da de alta** ni edita datos.

**Importar** (botón en Afiliados, `/afiliados/importar`): carga masiva desde otro sistema con un Excel/CSV (fichas) y un zip (fotos y carpeta). Los socios nuevos entran a la app con `ChangeMe123!` y la cambian en Ajustes. Detalle: `get_help` topic `migracion`. Requiere `members.import` + `members.write`.

Si no ves el menú, tu rol no tiene permiso de afiliados.
