# Casos de uso — Roles y permisos

**Estado:** Cerrado (v1)  
**Reglas:** RN-ROL-*, RN-TEN-002/008  
**Dominio:** Rol, Permiso, UsuarioStaff, EventoAuditoria

---

## CU-ROL-001 Crear tenant (Super Admin)

**Actor:** Super Administrador

**Flujo principal:**
1. Crea Tenant (nombre, estado activo).
2. Crea Sucursal inicial (S2).
3. Genera roles seed (Admin, Profesor, Afiliado, …).
4. Crea usuario Admin del gym.
5. Aplica config default (tolerancia 15, etc.).

**Reglas relacionadas:** RN-TEN-002, RN-ROL-002, RN-TEN-004

---

## CU-ROL-002 Suspender tenant

**Actor:** Super Admin

**Flujo principal:** Marca tenant suspendido → staff/afiliados no operan; accesos denegados.

**Reglas relacionadas:** RN-TEN-002

---

## CU-ROL-003 Crear / editar rol custom

**Actor:** Admin gym (o rol con permiso)

**Flujo principal:**
1. Define nombre.
2. Asigna permisos/flags (incl. peligrosos explícitos).
3. Define alcance de alumnos para roles tipo profesor (todos vs restringido) si aplica.
4. Guarda.

**Reglas relacionadas:** RN-ROL-002, RN-ROL-003, RN-ROL-007, RN-TEN-008

---

## CU-ROL-004 Asignar roles a staff

**Actor:** Super Admin, Admin, u otro con permiso

**Flujo principal:**
1. Alta o edición de UsuarioStaff.
2. Asigna uno o **varios** roles.
3. Auditoría.

**Reglas relacionadas:** RN-ROL-004, RN-ROL-006

---

## CU-ROL-005 Separación afiliado / staff

**Actor:** Sistema / Admin

**Regla de flujo:**
- Si la misma persona es profe y socio: existen **dos perfiles** (staff y afiliado), sin mezclar sesión de app.
- Vinculación opcional “misma persona” puede ser metadata futura; MVP: gestión explícita de ambos perfiles.

**Reglas relacionadas:** RN-ROL-005

---

## CU-ROL-006 Autorizar acción por permiso

**Actor:** Sistema

**Flujo principal:**
1. Usuario intenta acción.
2. Sistema une permisos de todos sus roles.
3. Si falta permiso/flag → 403 / mensaje.
4. Si es acción peligrosa → exige flag explícito.

**Reglas relacionadas:** RN-ROL-007, RN-ROL-009

---

## CU-ROL-007 Registrar auditoría

**Actor:** Sistema

**Precondiciones:** Acción crítica (pase manual, devolución, baja, cambio de precio/pack, config MP, etc.).

**Flujo principal:** Persiste EventoAuditoria (quién, qué, cuándo, antes/después).

**Reglas relacionadas:** RN-ROL-008
