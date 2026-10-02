# Cuenta Faciliter

**Estado:** Implementado (v1)  
**Actor:** Persona con sesión (identity, socio o staff).

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

[Índice CU](./README.md)
