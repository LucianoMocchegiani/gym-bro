# Casos de uso — Afiliados

**Estado:** Cerrado (v1)  
**Reglas:** RN-TEN-*, RN-ROL-*  
**Dominio:** Afiliado, CredencialVinculo

---

## CU-AFI-001 Registrar afiliado

**Actor:** Staff con permiso de afiliados (Admin / rol custom)

**Precondiciones:**
- Staff autenticado en el tenant.
- Datos mínimos definidos por el gym (nombre, contacto, etc.).

**Flujo principal:**
1. Staff inicia alta de afiliado.
2. Completa datos personales y de contacto.
3. (Opcional) Asocia sucursal default.
4. Sistema valida unicidad razonable (ej. email/DNI según config).
5. Sistema crea Afiliado en estado activo (o pendiente si se define onboarding).
6. Sistema dispara emisión de **credencial de vínculo** SSI vía adapter (o la encola si el proveedor no responde de inmediato).
7. Sistema registra auditoría del alta.

**Flujos alternativos / errores:**
- Datos inválidos o duplicados → mensaje y no crea.
- Fallo de emisión SSI → afiliado queda creado; credencial en estado pendiente/reintento; no bloquea el alta administrativa.

**Postcondiciones:**
- Afiliado existe en el tenant.
- Evento de auditoría registrado.

**Reglas relacionadas:** RN-TEN-001, RN-ACC-002, RN-ROL-008

---

## CU-AFI-002 Editar ficha de afiliado

**Actor:** Staff con permiso

**Precondiciones:** Afiliado existente en el tenant.

**Flujo principal:**
1. Staff abre ficha.
2. Modifica campos permitidos.
3. Sistema guarda y audita cambios sensibles (contacto, documento).

**Errores:** Sin permiso → denegado.

**Postcondiciones:** Ficha actualizada.

**Reglas relacionadas:** RN-TEN-001, RN-ROL-007 (si el campo es sensible)

---

## CU-AFI-003 Dar de baja / suspender afiliado

**Actor:** Staff con flag peligroso de baja

**Precondiciones:** Afiliado activo.

**Flujo principal:**
1. Staff solicita baja o suspensión e indica motivo.
2. Sistema confirma.
3. Sistema marca afiliado inactivo/suspendido.
4. Sistema revoca o marca no usable la credencial de vínculo (adapter).
5. Contrataciones activas: se marcan según política (no auto-reembolso salvo flujo de devolución).
6. Auditoría.

**Errores:** Sin flag → denegado.

**Postcondiciones:** Ingresos futuros denegados por identidad/estado.

**Reglas relacionadas:** RN-ROL-007, RN-ROL-008, RN-ACC-002

---

## CU-AFI-004 Consultar estado de cuenta (staff)

**Actor:** Staff con permiso de lectura de afiliados

**Precondiciones:** Afiliado existente.

**Flujo principal:**
1. Staff abre “estado de cuenta”.
2. Sistema muestra contrataciones, créditos, deuda, pagos recientes, reservas próximas.

**Postcondiciones:** Solo lectura.

**Reglas relacionadas:** RN-TEN-008 (si el actor es profesor con alcance restringido)

---

## CU-AFI-005 Ver mi perfil y estado de cuenta (afiliado)

**Actor:** Afiliado

**Precondiciones:** Afiliado autenticado.

**Flujo principal:**
1. Afiliado abre perfil / cuenta.
2. Sistema muestra sus contrataciones, créditos, deuda, comprobantes, reservas.

**Postcondiciones:** Solo datos propios.

**Reglas relacionadas:** RN-TEN-001

---

## CU-AFI-006 Reemitir credencial de vínculo

**Actor:** Staff con permiso / Super Admin soporte

**Precondiciones:** Afiliado activo; credencial perdida, revocada o fallida.

**Flujo principal:**
1. Actor solicita reemisión.
2. Sistema invalida credencial anterior si existe.
3. Adapter SSI emite nueva credencial de vínculo.
4. Auditoría.

**Errores:** Proveedor caído → reintento / estado pendiente.

**Postcondiciones:** Nueva referencia de credencial asociada al afiliado.

**Reglas relacionadas:** RN-ACC-001, RN-ACC-002
