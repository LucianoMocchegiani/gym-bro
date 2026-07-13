# Casos de uso — Notificaciones

**Estado:** Cerrado (v1)  
**Reglas:** RN-NOT-*  
**Dominio:** PlantillaNotificacion, PreferenciaNotificacion, Notificacion

**Eventos MVP:** E1…E9 (ver RN-NOT-002).

---

## CU-NOT-001 Enviar notificación de evento (sistema)

**Actor:** Sistema

**Precondiciones:** Evento de negocio ocurrido; evento habilitado en el gym; destinatario con preferencia ON para ese evento (si aplica).

**Flujo principal:**
1. Sistema resuelve plantilla del gym (o default).
2. Renderiza con datos del evento (nombre gym como branding).
3. Crea Notificacion in-app.
4. Envía email N1.
5. Guarda estado de envío (ok/error).

**Errores:** Fallo email → in-app igual queda; reintento según política técnica.

**Reglas relacionadas:** RN-NOT-001, RN-NOT-003, RN-NOT-004

---

## CU-NOT-002 Editar plantilla de notificación

**Actor:** Admin (permiso config)

**Flujo principal:**
1. Elige código de evento.
2. Edita asunto/cuerpo (variables documentadas: `{{nombre}}`, `{{monto}}`, etc.).
3. Activa/desactiva evento.
4. Guarda.

**Reglas relacionadas:** RN-NOT-007, RN-NOT-003

---

## CU-NOT-003 Gestionar preferencias (afiliado)

**Actor:** Afiliado

**Flujo principal:**
1. Abre configuración de avisos.
2. Activa/desactiva eventos que quiera.
3. Guarda PreferenciaNotificacion.

**Nota:** Producto prioriza que el usuario no desinstale; puede apagar todos los que quiera.

**Reglas relacionadas:** RN-NOT-005

---

## CU-NOT-004 Preferencias / bandeja admin

**Actor:** Admin / staff con permiso

**Flujo principal:**
1. Recibe E1/fallos MP/u otros configurados para staff.
2. Consulta bandeja in-app de operación.

**Reglas relacionadas:** RN-NOT-006

---

## CU-NOT-005 Marcar in-app como leída

**Actor:** Usuario autenticado

**Flujo principal:** Abre notificación → `inAppLeida = true`.

**Reglas relacionadas:** RN-NOT-001

---

[Índice](../00-indice.md) · [Siguiente: Roles y permisos →](./roles-permisos.md)
