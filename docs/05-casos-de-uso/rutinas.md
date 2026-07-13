# Casos de uso — Rutinas

**Estado:** Cerrado (v1)  
**Reglas:** RN-RUT-*  
**Dominio:** Ejercicio, PlantillaRutina, RutinaAsignada, RegistroCumplimiento, Medicion, FotoProgreso

---

## CU-RUT-001 Alta de ejercicio en catálogo del gym

**Actor:** Staff con permiso de rutinas (default Admin/Profesor)

**Precondiciones:** Tenant activo.

**Flujo principal:**
1. Actor crea ejercicio (nombre, notas, grupo muscular opcional).
2. Sistema guarda en catálogo del gym.

**Reglas relacionadas:** RN-RUT-001, RN-RUT-002

---

## CU-RUT-002 Crear plantilla de rutina (N días)

**Actor:** Staff con permiso

**Flujo principal:**
1. Actor define nombre y cantidad de días (2, 3, 5, …).
2. Por cada día agrega ejercicios con series/reps/peso sugerido/descanso/notas.
3. Guarda PlantillaRutina.

**Reglas relacionadas:** RN-RUT-003

---

## CU-RUT-003 Asignar rutina a afiliado (copia)

**Actor:** Staff con permiso

**Precondiciones:** Plantilla existente; afiliado visible según alcance.

**Flujo principal:**
1. Actor elige plantilla y afiliado.
2. Sistema crea **RutinaAsignada** como copia (snapshot).
3. Notificación E7.
4. Auditoría opcional.

**Postcondiciones:** Cambios futuros a la plantilla no afectan esta copia.

**Reglas relacionadas:** RN-RUT-004, RN-RUT-005, RN-NOT-002

---

## CU-RUT-004 Editar plantilla vs editar copia asignada

**Actor:** Staff con permiso

**Flujo A — Plantilla:** edita modelo; no altera RutinasAsignadas previas.  
**Flujo B — Copia:** edita solo la rutina del afiliado.

**Reglas relacionadas:** RN-RUT-005

---

## CU-RUT-005 Ver mis rutinas (afiliado)

**Actor:** Afiliado

**Flujo principal:**
1. Lista rutinas activas.
2. Abre día/ejercicios.

**Reglas relacionadas:** RN-RUT-004

---

## CU-RUT-006 Registrar cumplimiento y tiempos

**Actor:** Afiliado

**Precondiciones:** RutinaAsignada activa.

**Flujo principal:**
1. Afiliado marca ejercicios/series hechos.
2. Registra descansos y tiempo de ejecución de la sesión de rutina.
3. Sistema guarda RegistroCumplimiento.

**Reglas relacionadas:** RN-RUT-006

---

## CU-RUT-007 Cargar medición o foto de progreso (opcional)

**Actor:** Afiliado (y staff con permiso)

**Flujo principal:**
1. Actor carga métricas y/o foto.
2. Sistema almacena Medicion/FotoProgreso.
3. No es obligatorio para usar el resto del módulo.

**Reglas relacionadas:** RN-RUT-007

---

## CU-RUT-008 Desactivar rutina asignada

**Actor:** Staff con permiso / Afiliado (si se habilita)

**Flujo principal:** Marca rutina inactiva; deja de mostrarse como activa.

**Reglas relacionadas:** RN-RUT-004
