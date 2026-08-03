# GymBro — Documento maestro

**Estado:** Cerrado (v1)  
**Fecha de definición:** 2026-07-13  
**Idioma:** Español  
**Nombre:** GymBro (provisorio; puede cambiar)

---

## 1. Visión del producto

GymBro es una **plataforma SaaS multi-tenant** para gimnasios independientes y estudios (pilates, funcional, etc.) en **Argentina**.

No es una app para un solo gym: cada establecimiento es un **tenant** con sus afiliados, servicios, cobros y acceso.

Se concibe como un **ERP + CRM + app** liviano: gestión del negocio, cobro, ingreso por QR (identidad SSI modulable) y experiencia del afiliado. La **tienda online** y el white label no forman parte del MVP.

---

## 2. Objetivos

1. Que el dueño administre afiliados, servicios, packs, sesiones, cobros y caja en un solo lugar.
2. Que el afiliado pague, reserve, vea rutinas y entre al gym con QR desde la app.
3. Que el acceso sea **intercambiable** (SSI/Quark u otro proveedor) sin rehacer el core.
4. Documentar a nivel **C-producto** (casos de uso densos, reglas, dominio, wireframes ASCII, pruebas manuales) para desarrollar con precisión (humano + IA).
5. Crecer **módulo a módulo** post-MVP, con backlog explícito.

---

## 3. Problemas que resuelve

- Cobros y deudas desordenados (efectivo + online).
- Control de acceso improvisado o desconectado de la cuota/pack.
- Estudios por clase y gyms “libres” forzados a herramientas distintas.
- Falta de autogestión del afiliado (pagar, reservar, ver rutina).
- Roles rígidos (recepción/profe) sin poder adaptar permisos.

---

## 4. Público objetivo

| Segmento | Notas |
|----------|--------|
| Gimnasios independientes (no cadenas grandes) | Acceso libre + clases especiales |
| Estudios (pilates, etc.) | Modelo fuerte en sesiones / cupos |
| Mercado | Argentina (primera versión) |

Cliente pagador: dueño del gym/estudio. Equipo GymBro: **1 dev** + **socio** (negocio/venta).

---

## 5. Modelo de negocio SaaS

| Tema | Decisión MVP |
|------|----------------|
| Multi-tenant | Sí (un gym = un tenant) |
| Planes comerciales GymBro | **Un solo plan** hoy; arquitectura lista para más planes y módulos por plan |
| White label | **No** en MVP |
| Facturación AFIP al afiliado final | Post-MVP (MVP: comprobante interno) |

---

## 6. Actores

| Actor | Descripción |
|-------|-------------|
| **Super Administrador** | Solo equipo GymBro: crear/suspender gyms, soporte, métricas globales |
| **Admin del gym** | Dueño/gestor del tenant: config, cobros, staff, servicios |
| **Profesor** | Staff; permisos por rol (default: rutinas, sesiones según flags) |
| **Afiliado** | Socio del gym; app de autogestión + QR |

Roles **seed** al crear el gym (editables). El gym puede **crear y editar roles**. Un usuario staff puede tener **varios roles**. Afiliado y profesor son **perfiles distintos** aunque sea la misma persona en la vida real.

Detalle: ver casos de uso de roles/permisos (pendiente de redacción).

---

## 7. Módulos MVP (in)

| Módulo | Alcance resumido |
|--------|------------------|
| Tenants / gym | Alta por Super Admin; config básica; **Sucursal** en modelo (S2) con **1 sede visible** |
| Afiliados | Alta, ficha, estado de cuenta |
| Servicios | `ACCESO_LIBRE` y `POR_SESIONES` |
| Sesiones | Calendario, cupo, profesor (recomendado), recurrentes simples |
| Packs | Ofertas mensuales, créditos, packs compuestos |
| Pagos | Mercado Pago **del gym** + efectivo; idempotencia; estados básicos |
| Caja | Movimientos del día + **arqueo** |
| Acceso / QR | Adapter **SSI/Quark**; reglas en GymBro; pase manual; historial |
| Rutinas | Catálogo del gym; asignación por copia; cumplimiento + tiempos; mediciones/fotos **opcionales** |
| Notificaciones | **N1 Email** + in-app; eventos E1–E9; plantillas editables |
| Roles / permisos | Seed + custom; flags peligrosos; auditoría |
| Reportes mínimos | Activos, cuotas/packs, ingresos (sin dashboard fancy del mockup tienda) |

---

## 8. Fuera de MVP (out)

Ver lista completa y priorizable en [99-backlog-post-mvp.md](./99-backlog-post-mvp.md).

Destacados: **tienda/e-commerce**, white label, push/WhatsApp, AFIP, offline en puerta, catálogo global de ejercicios, IA, wearables, comunidad, multi-sede completa en UI.

---

## 9. Decisiones de dominio (resumen)

### 9.1 Servicios, sesiones, packs

- Vocabulario: **Servicio**, **Sesión**, **Pack**.
- Acceso libre y por sesiones son servicios distintos; el admin arma **packs**.
- Libre → cobro **mensual**. Packs compuestos → **mensual**. Por sesiones → drop-in y/o pack de créditos.
- **Reservar implica pagar** (MP o caja).
- Vencimiento de créditos: **MONTHLY** = fin del contrato; **ONE_TIME** configurable (default +1 mes). Ver RN-CON / RN-SER-007.
- Sin créditos: puede comprar otro pack.
- Cancelar pack compuesto: pierde **todo** el pack.
- Cupo ampliable por admin/profe.
- Cancelación de reserva: horas antes **por gym**.
- Lista de espera: 3 modos (auto / confirma afiliado / confirma staff).
- Sesión publicable sin profe (recomendado con profe por métricas).
- Admin puede reservar **por** el afiliado.
- Presente: al **verificar ingreso QR**.

### 9.2 Acceso / QR

- Diseño soporta escaneo gym→afiliado y afiliado→QR del gym; demo actual: afiliado escanea venue (`/puerta`).
- **Hoy (stub):** credencial de **vínculo** afiliado↔gym; GymBro decide derechos (enfoque B).
- **Camino Quark (diseño cerrado):** issuer+verifier por gym; VC tipada por pack (OID4VCI/VP); offers remotos al renovar; wallet con secreto local + biometría. Ver [12-acceso-quark-oid4-diseno.md](./12-acceso-quark-oid4-diseno.md).
- Tolerancia deuda: default **15 días**, configurable por gym.
- Multi-ingreso: configurable por gym.
- Pase manual: sí.
- Offline puerta: post-MVP.
- Historial de intentos con motivo: sí.

### 9.3 Pagos y caja

- MP del gym; mensualidades + packs + drop-in.
- Estados: `pendiente` → `aprobado` / `rechazado` / `reembolsado`.
- Contratación/reserva solo con pago **aprobado**.
- Idempotencia anti doble cobro; si ocurre → reembolso admin.
- Devolución pedida por afiliado (defaults configurables); admin siempre puede devolver.
- Comprobante interno + N1 + visible en app.

### 9.4 Rutinas

- Permiso (default admin + profe).
- Catálogo **solo del gym** (B).
- Rutinas N días; varias activas; copia al asignar.
- Cumplimiento + descansos + tiempo de ejecución.
- Mediciones/fotos opcionales.
- Independientes de sesiones.
- IA / automatización de series: post-MVP (anotado).

### 9.5 Notificaciones

- Email + in-app; gym apaga eventos; branding nombre del gym.
- Afiliado puede desactivar lo que quiera.
- Admin recibe avisos relevantes.
- Plantillas editables.
- Eventos: pago OK, por vencer, vencida/tolerancia, reserva OK/cancelada, lista espera, rutina asignada, denegado/deuda, devolución.

### 9.6 Roles

- Super Admin solo GymBro.
- Scope de alumnos del profe: **lo define el admin**; **default: ver todos** (lectura).
- Acciones sensibles: flag explícito.
- Auditoría: sí.

---

## 10. Diferenciadores

- Web + app con ingreso en Fase 1.
- Multi-tenant.
- Modular (servicios/packs, acceso adapter, permisos).
- Un modelo para gym libre **y** estudio por sesiones.
- Preparado para más planes SaaS y módulos sin reescribir el core.
- Documentación C-producto como base de desarrollo.

---

## 11. Roadmap de producto (alto nivel)

| Fase | Enfoque |
|------|---------|
| **MVP** | Lo de la sección 7 |
| **Post-MVP** | Un módulo (o pocos) por vez según backlog |
| Futuro | IA, wearables, comunidad, tienda, etc. |

No se comprometen fechas rígidas en v1 del maestro; el ritmo lo marca un solo desarrollador + validación con el socio.

---

## 12. Criterio de “hecho” de la documentación C-producto

- [x] Documento maestro + backlog post-MVP + índice/formato  
- [x] Glosario, dominio, reglas  
- [x] Casos de uso por módulo  
- [x] Arquitectura  
- [x] Wireframes ASCII  
- [x] Casos de prueba manuales  

---

## 13. Referencias

- Índice y formato: [00-indice.md](./00-indice.md)
- Backlog: [99-backlog-post-mvp.md](./99-backlog-post-mvp.md)
- Integración de acceso de referencia: proyecto Quark (`ba-quark-2.0`) como proveedor SSI vía adapter, no como ERP del gym.

---

[Índice](./00-indice.md) · [Siguiente: Glosario →](./02-glosario.md)
