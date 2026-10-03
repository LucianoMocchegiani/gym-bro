# Afiliados

El **afiliado** (socio) es quien consume los servicios y usa la **app**. No es staff.

Pantalla Admin: **Afiliados** (`/dashboard/afiliados`). Ahí buscás por nombre, email o documento, abrís la ficha y ves el estado de cuenta (packs contratados, contratos, créditos, pagos).

La **credencial de puerta** se emite al cobrar el pack. **Re-emitir** (ficha del socio) no cobra: usa el pack vigente hoy. El socio acepta en la app. El asistente **no** emite ni cobra.

**Carpeta** (ícono en la grilla): notas y PDF/imagen (rutina, estudios, etc.). Etiquetas las define el gym. El socio las ve en la app → Inicio → Documentos. Cómo usarla: `get_help` topic `carpeta`. El asistente **no** sube archivos.

**Alta:** nombre, mail, documento, etc. La contraseña inicial es **opcional**: vacía → `ChangeMe123!` temporal y la app le avisa que la cambie; si ya tiene cuenta Faciliter, conserva la suya. Entra a la app con ese mail, sin elegir el local (topic `cuenta`). Si el local usa ZKTeco, en la fila está **Acceso ZKTeco** para vincular su número del aparato.

El alta, la baja y la edición son en esa pantalla. El asistente busca y resume la cuenta, y puede **proponer** el alta, editar la ficha o cambiar el estado (se hace solo si tocás Confirmar; el estado pide escribir CONFIRMAR). Alta sin contraseña → `ChangeMe123!` temporal. No vende packs: eso es en Caja.

**Importar** (botón en Afiliados, `/dashboard/afiliados/importar`): carga masiva desde otro sistema con un Excel/CSV (fichas) y un zip (fotos y carpeta). Los socios nuevos entran a la app con `ChangeMe123!` y la cambian en Ajustes. Detalle: `get_help` topic `migracion`. Requiere `members.import` + `members.write`.

Si no ves el menú, tu rol no tiene permiso de afiliados.
