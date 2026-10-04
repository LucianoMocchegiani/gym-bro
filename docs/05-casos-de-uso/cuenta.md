# Cuenta Faciliter

**Estado:** Implementado (v1)  
**Actor:** Persona con sesión (identity, socio o staff); en CU-CTA-010, staff del gym.

## CU-CTA-001 Eliminar mi cuenta

**Reglas relacionadas:** RN-CTA-001 a RN-CTA-004.

**Precondiciones:** Sesión activa (no impersonada). No es dueña de un gym activo.

**Flujo principal**

1. **App:** Ajustes → **Eliminar cuenta**. **Web:** `faciliter.xyz/cuenta` → **Eliminar cuenta** (la página pública `/cuenta/eliminar` explica los pasos; es la URL de Google Play).
2. Ve qué se borra y qué conserva cada gym. Escribe **ELIMINAR** y confirma.
3. `DELETE /api/me/identity` con `{ "confirm": "ELIMINAR" }`:
   - sale de listas de espera; cancela débitos automáticos y reservas futuras (libera cupo);
   - desactiva sus usuarios staff, revoca sesiones, borra avisos y preferencias;
   - anonimiza la cuenta y audita `identity.delete` (global y en cada gym);
   - manda un mail de confirmación al mail original.
4. **App:** borra la wallet del celular y vuelve al login. **Web:** cierra sesión y muestra `/cuenta/eliminar?hecho=1`.

**Postcondición:** No se puede entrar con ese mail, Google ni Apple (o entra como cuenta nueva vacía). Los gyms siguen viendo la ficha y el historial.

**Errores**

- 400 si `confirm` no es `ELIMINAR`.
- 403 desde una impersonación.
- 409 si es dueña de un gym activo: "Primero da de baja o transferí el gym".

**Pendiente:** revocar el token de Sign in with Apple (necesita la clave `.p8` de Apple Developer); ver [publicar-tiendas.md](../mobile/publicar-tiendas.md).

---

## CU-CTA-010 Editar la web del gym

**Reglas relacionadas:** RN-CTA-005, RN-CTA-010.  
**Actor:** Staff con `tenant.settings.write` (con `tenant.settings.read` solo mira).

**Flujo principal**

1. Panel → **Sistema → Web del gym** (`/dashboard/web`). Si nunca se editó, arranca con una portada base y sin sliders.
2. **Portada:** título, subtítulo, imagen de fondo (JPG/PNG/WebP, ≥ 1200 px de ancho), descripción, enfoque, tono del texto, capa y color del título.
3. **Sliders** (hasta 5): título de la sección, slides (1 a 10) con título, texto, el mismo fondo y botón opcional (planes, reservar, comprar un pack o link https). Se agregan, quitan y reordenan.
4. La **vista previa** muestra la portada y el slide elegido; contadores de caracteres y avisos de contraste antes de publicar.
5. **Publicar:** se suben las imágenes nuevas (`POST /api/upload`, carpeta `site`) y `PUT /api/tenant-site` guarda y publica. La web (`{slug}/`) lo muestra al instante: portada, sliders (rotan solos cada 6 s) y planes.

**Alternativas**

- **Volver a la vidriera por defecto:** `DELETE /api/tenant-site` (con confirmación) borra el contenido y sus imágenes.

**Errores (400)**

- Título corto, color del título ilegible sobre el fondo, imagen que no subió el gym, pack inexistente o inactivo, link que no es https, ids repetidos.

---

[Índice CU](./README.md)
