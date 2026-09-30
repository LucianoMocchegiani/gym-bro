# Carpeta (notas y archivos)

Cuando pregunten dónde guardar una **rutina**, estudio médico, PDF o nota del socio o del staff: usá este artículo **completo**. No digas que hay un módulo de rutinas con días/ejercicios: **eso no está**. La rutina es un PDF o una nota en la carpeta.

El asistente **explica**. **No sube archivos ni escribe notas.** Eso es en el panel.

## Qué es

Cada **afiliado** y cada **staff** tiene una carpeta: hasta **10 ítems** (notas Markdown + PDF o imagen). File máx. **5 MB**. Nota: 20.000 caracteres. Tipos: JPG, PNG, WebP, GIF, PDF.

Las **etiquetas** (Médico, Rutina, etc.) las arma **el gym**: no hay categorías fijas de Faciliter. En el modal: lista + “Crear etiqueta”.

Los files **no** son la foto de ficha. La foto de perfil sigue en la ficha (`POST /upload`, URL pública). La carpeta baja el file **con sesión** (JWT); no se comparte un link abierto de R2.

## Quién hace qué

| Acción | Dónde | Quién |
|--------|--------|--------|
| Crear nota, subir PDF/imagen, borrar, crear etiqueta | Panel Admin, modal **Carpeta** | Staff con `members.write` (socios) o `staff.write` (equipo) |
| Ver la carpeta de un socio | Grilla **Afiliados** | `members.read` |
| Ver la carpeta de un staff | Grilla **Staff** | `staff.read` |
| Ver **la propia** carpeta | App → **Inicio** → **Documentos** | El socio o el staff logueado |
| Subir desde la app | — | **No.** Solo el panel. |

## Panel (cómo se usa)

1. **Afiliados** (`/afiliados`) o **Staff** (`/staff`).
2. En la fila, ícono de **carpeta** (junto a ficha / credencial).
3. Modal: etiqueta → **Guardar nota** (Markdown: `#` títulos, `-` listas) o recuadro **Elegir archivo** → **Subir archivo**.
4. **Contenido:** solo título o nombre de file y fecha. **Abrir** nota = visor Markdown; **Abrir** file = descarga autenticada. Eliminar con permiso de escritura.

Sin permiso de afiliados/staff no ves el menú o el ícono no sirve (403).

## App

Pestañas del socio: Inicio · Acceso · Ajustes. Staff: Inicio · Acceso · Ajustes.

**Documentos** está en **Inicio**, junto a Sesiones y Tienda (staff: junto a Sesiones y Caja). No es un cuarto tab. Lista título o nombre de archivo y fecha; toca una nota para el visor Markdown; un file imagen se ve en pantalla; un PDF se comparte/abre con el visor del celular.

Si está vacío: el gym todavía no cargó nada en el panel.

## Qué no es

- No hay plantilla de rutina por días, catálogo de ejercicios ni “asignar rutina” como módulo aparte.
- El asistente no lista el contenido de la carpeta con una tool: no inventes archivos. Mandá al modal o a Documentos. Cuando en el futuro escriba notas, el formato es Markdown.
- No uses `POST /upload` para “guardar el PDF del socio”: eso es foto de catálogo/ficha.

## Permisos (resumen)

- Socio: solo su carpeta en la app.
- Staff: según `members.read`/`write` y `staff.read`/`write` (como ficha).
