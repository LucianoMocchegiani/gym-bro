# Casos de uso — Acceso / QR / SSI

**Estado:** Cerrado (v1)  
**Reglas:** RN-ACC-*, RN-TEN-004/007, RN-RES-006/007, RN-SER-002  
**Dominio:** IntentoIngreso, CredencialVinculo, AccessAdapterConfig

---

## CU-ACC-001 Verificar ingreso (flujo canónico)

**Actor:** Sistema + Afiliado (y/o dispositivo del gym)

**Precondiciones:**
- Adapter de acceso configurado (MVP: SSI/Quark).
- Conectividad online (RN-ACC-008).

**Flujo principal:**
1. Se presenta identidad por QR/credencial (modo A: gym escanea afiliado; o modo B: afiliado escanea QR del local — ambos soportados en diseño).
2. Adapter resuelve identidad → `afiliadoId` + `tenantId` (credencial de vínculo).
3. GymBro evalúa en orden:
   1. Afiliado activo y tenant activo.
   2. Sucursal correcta (si aplica).
   3. Derechos: contratación con **acceso libre** vigente **o** reserva confirmada (o elegibilidad de ingreso tardío) para sesión en curso/próxima según config.
   4. Deuda vs tolerancia (RN-ACC-005).
   5. Multi-ingreso (RN-TEN-007 / RN-ACC-009).
4. Si OK → `permitido`; registra IntentoIngreso; si hay sesión asociada → marca presente (RN-RES-007).
5. Si no OK → `denegado` con motivo; IntentoIngreso; opcional E8 según preferencias.

**Errores:**
- Credencial inválida/revocada → deny `credencial_invalida`.
- Adapter caído → deny/error operativo `proveedor_no_disponible` (sin offline MVP).

**Postcondiciones:** Intento persistido siempre.

**Reglas relacionadas:** RN-ACC-001..007, RN-ACC-009, RN-SER-002

---

## CU-ACC-002 Ingreso por acceso libre

**Actor:** Afiliado

**Precondiciones:** Contratación que otorga ACCESO_LIBRE vigente **o** vencida dentro de `debtToleranceDays` (RN-ACC-005); no se exige reserva.

**Flujo principal:**
1. Ejecuta CU-ACC-001.
2. La evaluación de derechos usa componente libre de la contratación (pack simple o mixto), o gracia `ok_deuda_tolerancia` si el pack libre ya venció y el atraso ≤ tolerancia.

**Errores:** Solo packs por sesiones sin libre → deny `sin_derecho` (salvo que tenga sesión reservada). Atraso > tolerancia → `deuda_excedida`.

**Reglas relacionadas:** RN-SER-002, RN-ACC-004, RN-ACC-005

---

## CU-ACC-003 Ingreso asociado a sesión reservada

**Actor:** Afiliado

**Precondiciones:** Reserva confirmada para sesión cuyo horario el sistema asocia al momento del escaneo.

**Flujo principal:**
1. CU-ACC-001.
2. Sistema vincula IntentoIngreso a Sesion/Reserva.
3. Marca asistencia/presente.

**Errores:** Reserva de otra franja no asociada → no marca esa sesión (puede aún entrar por libre si corresponde).

**Reglas relacionadas:** RN-RES-007

---

## CU-ACC-004 Pase manual

**Actor:** Staff con permiso `acceso.pase_manual`

**Precondiciones:** Afiliado identificado (búsqueda) o visita excepcional documentada.

**Flujo principal:**
1. Staff selecciona afiliado (o registra visita con datos mínimos si se permite — MVP: afiliado existente).
2. Indica motivo (deuda, olvido de celular, cortesía, etc.).
3. Sistema registra IntentoIngreso `permitido` con flag paseManual + actor.
4. EventoAuditoria.
5. Si hay sesión elegida, puede marcar presente.

**Errores:** Sin permiso → denegado.

**Postcondiciones:** Ingreso permitido pese a reglas automáticas fallidas.

**Reglas relacionadas:** RN-ACC-006, RN-ROL-008

---

## CU-ACC-005 Consultar historial de ingresos

**Actor:** Staff con permiso; Afiliado (solo propios)

**Precondiciones:** Autenticado.

**Flujo principal:**
1. Actor filtra por fecha/afiliado/resultado.
2. Sistema lista IntentosIngreso con motivos.

**Reglas relacionadas:** RN-ACC-007

---

## CU-ACC-006 Configurar adapter de acceso

**Actor:** Admin gym (y Super Admin soporte)

**Precondiciones:** Permiso de configuración.

**Flujo principal:**
1. Actor elige proveedor (`SSI_QUARK` u otro futuro).
2. Carga parámetros (credenciales, endpoints).
3. Prueba de conexión opcional.
4. Guarda AccessAdapterConfig.

**Postcondiciones:** CU-ACC-001 usa el proveedor activo.

**Reglas relacionadas:** RN-ACC-001

---

## CU-ACC-007 Configurar políticas de acceso del gym

**Actor:** Admin

**Flujo principal:**
1. Define tolerancia (default 15).
2. Define multi-ingreso.
3. Define si permite ingreso tardío a sesiones (RN-RES-006).
4. Guarda ConfiguracionGym.

**Reglas relacionadas:** RN-TEN-004, RN-TEN-007, RN-RES-006

---

[Índice](../00-indice.md) · [Siguiente: Rutinas →](./rutinas.md)
