# Carpeta (notas y archivos)

Cuando pregunten dónde guardar una **rutina**, estudio médico, PDF o nota del socio o del staff: usá este artículo **completo**. No digas que hay un módulo de rutinas con días/ejercicios: **eso no está**. La rutina es un PDF o una nota en la carpeta.

El asistente **explica**. **No sube archivos ni escribe notas.** Eso es en el panel.

## Qué es

Cada **afiliado** y cada **staff** tiene una carpeta: lista de **notas** (texto) y **archivos** (PDF o imagen: JPG, PNG, WebP, GIF, máx. 10 MB).

Las **etiquetas** (Médico, Rutina, etc.) las arma **el gym**: no hay categorías fijas de Faciliter. En el modal: lista + “Crear etiqueta”.

Los files **no** son la foto de ficha. La foto de perfil sigue en la ficha (`POST /upload`, URL pública). La carpeta baja el file **con sesión** (JWT); no se comparte un link abierto de R2.

## Quién hace qué

| Acción | Dónde | Quién |
|--------|--------|--------|
| Crear nota, subir PDF/imagen, borrar, crear etiqueta | Panel Admin, modal **Carpeta** | Staff con `members.write` (socios) o `staff.write` (equipo) |
| Ver la carpeta de un socio | Grilla **Afiliados** | `members.read` |
| Ver la carpeta de un staff | Grilla **Staff** | `staff.read` |
| Ver **la propia** carpeta | App → **Ajustes** → **Mis documentos** | El socio o el staff logueado |
| Subir desde la app | — | **No.** Solo el panel. |

## Panel (cómo se usa)

1. **Afiliados** (`/afiliados`) o **Staff** (`/staff`).
2. En la fila, ícono de **carpeta** (junto a ficha / credencial).
3. Modal: elegir o crear etiqueta → **Guardar nota** (título opcional + texto) o **imagen** (mismo control que la foto de ficha) **o PDF** → **Subir archivo**.
4. Lista: abrir file (nueva pestaña, autenticado) o eliminar.

Sin permiso de afiliados/staff no ves el menú o el ícono no sirve (403).

## App

Pestañas del socio: Inicio · Acceso · Ajustes. Staff: Inicio · Acceso · Ajustes.

**Mis documentos** está en **Ajustes** (no es un cuarto tab). Lista notas y files; toca una nota para leerla; un file imagen se ve en pantalla; un PDF se comparte/abre con el visor del celular.

Si está vacío: el gym todavía no cargó nada en el panel.

## Qué no es

- No hay plantilla de rutina por días, catálogo de ejercicios ni “asignar rutina” como módulo aparte.
- El asistente no lista el contenido de la carpeta con una tool: no inventes archivos. Mandá al modal o a Mis documentos.
- No uses `POST /upload` para “guardar el PDF del socio”: eso es foto de catálogo/ficha.

## Permisos (resumen)

- Socio: solo su carpeta en la app.
- Staff: según `members.read`/`write` y `staff.read`/`write` (como ficha).
