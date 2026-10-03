# Migración de afiliados (importar desde otro sistema)

Para un gym que **ya tiene** socios en otro sistema (o en un Excel). Trae a la persona: **ficha + foto de perfil + carpeta**. Packs, contratos, deudas, pagos y credenciales **no** se migran: se arman en Faciliter (Caja, Packs).

Pantalla Admin: **Afiliados → botón Importar** (`/dashboard/afiliados/importar`). Permisos: `members.import` (peligroso) **y** `members.write`. El Admin los tiene; a otro rol hay que dárselos en Roles y permisos. Sin los dos, el botón no aparece.

## Paso 1 — Planilla (fichas)

- Archivo **Excel (.xlsx)** o **CSV**. Una fila por socio. Excel viejo (.xls): guardarlo como .xlsx o .csv.
- Columnas que entiende: **mail** (obligatorio), **nombre** (obligatorio), apellido, DNI/documento, teléfono, estado.
- El sistema **sugiere qué columna es cada dato** por el nombre del encabezado (Mail, Correo, DNI, Celular…). Se puede corregir a mano. Ese mapeo queda guardado para la próxima importación del gym.
- Si hay columna apellido, se une al nombre.
- Estado: activo / suspendido / baja (o inactivo). Vacío = activo. Una palabra que no reconoce → esa fila sale con error.
- **Vista previa** antes de cargar: cuántos son nuevos, cuántos ya existen, cuántos tienen error, y repetidos dentro de la planilla.
- Para cargar hay que escribir **CONFIRMAR**.
- Al final: resumen y **CSV** con lo omitido y los errores (se abre en Excel).

Reglas:

- **Sin mail → no se carga** (sale en el CSV).
- **Socio que ya existe** en el gym (mismo mail, mismo DNI aunque tenga puntos o guiones, o misma cuenta) → **se omite, no se pisa nada**. Por eso se puede volver a subir el mismo archivo sin duplicar.
- No se mandan mails ni avisos a los socios importados, y no se emite credencial (eso pasa al cobrar el pack).

## Paso 2 — Fotos y carpeta (carpeta de la PC o zip)

Después de cargar las fichas. Se puede **elegir una carpeta** de la PC (Elegir carpeta) o subir un **.zip** (Elegir zip), con esta forma:

```
fotos/30123456.jpg                 → foto de perfil del socio con DNI 30123456
fotos/ana@mail.com.png             → o por mail
carpeta/30123456/apto-medico.pdf   → archivo a la carpeta de ese socio
carpeta/ana@mail.com/rutina.jpg
```

- El nombre del archivo (foto) o de la subcarpeta (carpeta) es el **DNI o el mail** del socio. El DNI puede ir con o sin puntos.
- Fotos: jpg, png, webp, gif. Carpeta: PDF o imagen. Máximo **5 MB** por archivo y **10 ítems** por socio (mismo tope que la carpeta normal).
- **Si el socio ya tiene foto o algo en la carpeta, no se le carga nada** y se avisa como omitido (“ya tiene archivos cargados”). Volver a subir lo mismo no duplica.
- Al elegir carpeta, el navegador puede preguntar “¿Subir N archivos a este sitio?”: es normal.
- Lo que no sigue la convención se ignora y se lista. Archivos sin socio que coincida → omitidos.
- También pide **CONFIRMAR** y deja un CSV con lo omitido.

## Mientras corre

- Lo procesa el navegador por tandas: **no cerrar la pestaña** hasta que termine.
- Si se corta (internet, servidor), aparece **Reintentar** y sigue desde donde quedó. Si se cerró la pestaña, volver a subir el archivo: lo ya cargado sale como existente.
- **Últimas importaciones** (abajo en la pantalla) muestra cada corrida con sus contadores. Cada corrida queda en **Auditoría** como `member.import`.

## Contraseña de los socios importados

- Los socios nuevos entran a la app con su **mail** y la contraseña temporal **`ChangeMe123!`**. El gym se la tiene que comunicar.
- En la app (Ajustes) les aparece un aviso para cambiarla: Ajustes → **Cambiar contraseña**.
- Si entran con **Google o Apple** usando ese mismo mail, la temporal se **borra** sola (ya no sirve). Después pueden crear una contraseña propia en Ajustes → **Crear contraseña**.
- Si la persona **ya tenía cuenta** Faciliter (por ejemplo, socia de otro gym), su contraseña **no se toca**: entra con la que ya usaba.
- El staff **no** puede ver ni reiniciar contraseñas de socios. Todavía no hay “olvidé mi contraseña” por mail: si alguien la pierde, puede entrar con Google/Apple con el mismo mail.

## Qué no hace

- No migra packs, deudas, historial de pagos, clases ni accesos.
- No elige sede desde la pantalla (todos quedan sin sede asignada).
- La sugerencia de columnas es automática por nombre, **no** con IA (por ahora).
- El asistente **no importa**: explica y manda a la pantalla. No recibe archivos por el chat.
