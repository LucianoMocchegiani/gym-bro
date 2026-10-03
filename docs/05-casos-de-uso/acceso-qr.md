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
2. Adapter OID4VP resuelve identidad → `memberId` + tenant (claim de la VC de pack).
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
2. Opcionalmente elige sesión (default: sin sesión). En Admin: reservas `CONFIRMED` del afiliado en clases que aún no terminaron (no el calendario del gym); si envía `sessionId`, la API exige esa reserva confirmada y marca presente.
3. Indica motivo (deuda, olvido de celular, cortesía, etc.).
4. Sistema registra IntentoIngreso `permitido` con flag paseManual + actor.
5. EventoAuditoria.

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

**Flujo principal (implementado):**
1. En Admin → Config → Operación, el actor elige **Puerta**: "QR con la app (Kuatia)" o "Acceso ZKTeco" (`PATCH /tenant-settings` `accessProvider`).
2. Confirma (el diálogo avisa qué deja de funcionar).
3. Se guarda `tenant_settings.access_provider` (auditado con el resto de la config).

**Postcondiciones:** Kuatia → CU-ACC-001 por QR. ZKTeco → CU-ACC-008; la app no recibe credenciales nuevas y `/dashboard/puerta` muestra "Este gym usa acceso ZKTeco" + últimos ingresos en lugar del QR. Parámetros de conexión por proveedor (endpoints, token de dispositivo): post-MVP.

**Reglas relacionadas:** RN-ACC-001, RN-ACC-010

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

## CU-ACC-008 Ingreso por acceso ZKTeco

**Actor:** Afiliado o staff + puente del gym (aparato ZKTeco: molinete, puerta, lector)

**Precondiciones:** Gym con `access_provider = ZKTECO` (CU-ACC-006). El puente se autentica como staff con `access.verify` (token de dispositivo: post-MVP).

**Flujo principal:**
1. La persona se identifica en el aparato (PIN/tarjeta); el puente envía `POST /access/zkteco/events` `{ userId, occurredAt, deviceSerial? }`.
2. Faciliter resuelve el número: vínculo (CU-ACC-009) → socio o staff; si no hay, socio con ese DNI (RN-ACC-011).
3. Evalúa con las **mismas reglas** que CU-ACC-001 (activo, reserva en ventana, acceso libre, deuda, multi-ingreso; staff activo).
4. Registra IntentoIngreso con `channel = zkteco`, `scanMode = member_at_device`.
5. Si permitido → pide abrir la puerta (adaptador que registra en log en este corte) y responde `open = true`.

**Errores:**
- Número sin resolver → deny `sin_vinculo`.
- Evento repetido (misma serie + número + hora) → mismo resultado, `duplicate = true`, `open = false`.
- Gym no ZKTeco → 409.

**Postcondiciones:** Intento visible en `/dashboard/puerta` → Historial con canal "ZKTeco".

**Reglas relacionadas:** RN-ACC-007, RN-ACC-010, RN-ACC-011

---

## CU-ACC-009 Vincular número del aparato

**Actor:** Staff con `members.write` (socios) o `staff.write` (staff)

**Precondiciones:** Gym ZKTeco.

**Flujo principal:**
1. En Afiliados o Staff, el actor abre la acción de acceso de la fila ("Acceso ZKTeco").
2. Ve los números vinculados y, para socios, si el DNI sirve de respaldo.
3. Agrega un número (letras, dígitos, `-`, `_`; hasta 32) o lo desvincula.
4. Se audita (`access.link.create` / `access.link.delete`).

**Errores:** Número ya vinculado a otra persona del gym → 409.

**Reglas relacionadas:** RN-ACC-011

---

[Índice](../00-indice.md) · [Siguiente: Rutinas →](./rutinas.md)
