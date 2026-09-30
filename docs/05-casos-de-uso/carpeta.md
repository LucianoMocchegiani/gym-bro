# Carpeta de documentos (socio y staff)

**Estado:** Implementado (v1)  
**Actor:** Staff con `members.write` / `staff.write` (alta); lectura `members.read` / `staff.read`; el dueño en la app.

## CU-FOL-001 Cargar nota o archivo (staff)

**Precondiciones:** Socio o staff existente. Etiquetas opcionales del tenant.

**Flujo principal**

1. En la grilla, abre **Carpeta**.
2. Crea etiqueta si hace falta, o elige una existente.
3. Guarda una **nota** (texto) o sube **PDF/imagen**.
4. El file queda en R2 con key privada; no usa `POST /upload`.

**Postcondición:** Ítem visible en Admin y en **Mis documentos** del dueño.

## CU-FOL-002 Ver / borrar carpeta ajena (staff)

**Flujo:** Lista y abre files con JWT. Borrar con permiso write del tipo de dueño.

## CU-FOL-003 Ver mi carpeta (app)

**Actor:** Afiliado o staff autenticado.

**Flujo:** Ajustes → Mis documentos. Solo lectura. Files por `GET /me/folder/:id/file`.

---

[Índice CU](./README.md)
