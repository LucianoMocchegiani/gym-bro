# Roles y permisos

**Staff** es el equipo del local (dueño, recepción, profesor). Cada uno entra al panel con su usuario. Un usuario puede tener **varios roles**. Los permisos (caja, puerta, catálogo, etc.) salen de esos roles.

El **afiliado** no es un rol de staff: es otro perfil, el de la app.

Pantalla Admin: **Roles y permisos** (`/dashboard/roles`). El staff se asigna en **Staff** (`/dashboard/staff`). En Staff, cada persona tiene **carpeta** (notas/PDF), igual que un afiliado: topic `carpeta`.

El asistente lista roles y códigos, y puede **proponer** crear o editar roles, dar de alta o editar staff y asignarle roles (se hace solo si tocás Confirmar; lo peligroso pide escribir CONFIRMAR). Alta de staff sin contraseña → `ChangeMe123!` temporal. No borra roles ni staff.

Algunos permisos están marcados como **peligrosos**. Ejemplo: `members.import` (migrar afiliados masivamente; también exige `members.write`). Detalle: topic `migracion`.

Hace falta permiso de roles.
