# GymBro — Modelo de dominio

**Estado:** Cerrado (v1)  
**Glosario:** [02-glosario.md](./02-glosario.md)  
**Reglas:** [04-reglas-de-negocio.md](./04-reglas-de-negocio.md)

Modelo conceptual (no es esquema SQL final). Nombres en español de negocio; en código podrán mapearse a inglés.

---

## 1. Vista general

```text
Plataforma GymBro
 └── Tenant (Gimnasio)
      ├── Sucursal(es)          [S2: 1 visible en MVP]
      ├── Configuración
      ├── Roles / Permisos / Staff
      ├── Afiliados
      ├── Servicios
      │    └── Sesiones (+ Recurrencia)
      ├── Packs / Ofertas
      ├── Contrataciones
      ├── Reservas / ListaEspera
      ├── Pagos / Caja / Arqueo
      ├── Ingresos (acceso)
      ├── CatálogoEjercicios / Rutinas
      └── Notificaciones (plantillas, preferencias)
```

---

## 2. Entidades principales

### 2.1 Plataforma

| Entidad | Responsabilidad | Atributos clave (conceptuales) |
|---------|-----------------|--------------------------------|
| **Plataforma** | Contenedor SaaS | — |
| **Tenant** | Gym/estudio | nombre, estado (activo/suspendido), plan SaaS (uno hoy) |
| **UsuarioPlataforma** | Super Admin | identidad GymBro |

### 2.2 Organización del tenant

| Entidad | Responsabilidad | Atributos clave |
|---------|-----------------|-----------------|
| **Sucursal** | Sede | nombre, dirección, horarios, activa |
| **ConfiguracionGym** | Políticas | toleranciaDias (def. 15), horasCancelacionReserva, modoListaEspera, multiIngreso, alcanceAlumnosProfe, … |
| **Rol** | Perfil de permisos | nombre, seed/custom, flags |
| **Permiso** | Capability | código (ej. `caja.operar`, `acceso.pase_manual`) |
| **UsuarioStaff** | Persona staff | contacto, roles[], activo |
| **Afiliado** | Socio | datos personales, estado, sucursalDefault? |
| **CredencialVinculo** | Ref. SSI | id externo proveedor, estado emisión/revocación |

### 2.3 Catálogo comercial

| Entidad | Responsabilidad | Atributos clave |
|---------|-----------------|-----------------|
| **Servicio** | Qué se ofrece | tipo (`ACCESO_LIBRE` \| `POR_SESIONES`), nombre, activo, sucursal? |
| **Pack** | Cómo se vende/combina | componentes (servicios/créditos), precio, periodicidad, políticaVencimientoCreditos, políticaDevolucion |
| **Oferta** | Precio/modalidad puntual | puede unificarse con Pack en implementación |
| **Sesion** | Instancia calendarizada | servicioId, inicio, fin, cupo, cupoActual, profesorId?, sucursalId, estado |
| **ReglaRecurrencia** | Genera sesiones | patrón semanal, fechaInicio/fin, plantilla cupo/profe |

### 2.4 Contratación y reservas

| Entidad | Responsabilidad | Atributos clave |
|---------|-----------------|-----------------|
| **Contratacion** | Derechos vigentes del afiliado | afiliadoId, packId, vigenciaDesde/Hasta, creditosRestantes?, estado |
| **Reserva** | Lugar en sesión | sesionId, afiliadoId, estado, pagoId?, origen (afiliado\|staff) |
| **ListaEsperaItem** | Posición en cola | sesionId, afiliadoId, posicion, estado |

### 2.5 Pagos y caja

| Entidad | Responsabilidad | Atributos clave |
|---------|-----------------|-----------------|
| **Pago** | Cobro | monto, medio (`MP`\|`CAJA`), estado, idempotencyKey, afiliadoId, concepto |
| **CuentaMercadoPago** | Config tenant | credenciales/OAuth del gym |
| **MovimientoCaja** | Línea de caja | pagoId, fecha, usuarioStaffId, monto |
| **ArqueoCaja** | Cierre del día | fecha, esperado, declarado, diferencia, usuarioStaffId |
| **SolicitudDevolucion** | Pedido afiliado | pagoId, estado, motivo |
| **Comprobante** | Recibo interno | pagoId, numero, url/datos |

### 2.6 Acceso

| Entidad | Responsabilidad | Atributos clave |
|---------|-----------------|-----------------|
| **IntentoIngreso** | Log de puerta | afiliadoId?, resultado, motivo, sucursalId, sesionId?, modoEscaneo, staffPaseManual? |
| **AccessAdapterConfig** | Proveedor | tipo (`SSI_QUARK`\|…), params |

### 2.7 Rutinas

| Entidad | Responsabilidad | Atributos clave |
|---------|-----------------|-----------------|
| **Ejercicio** | Catálogo gym | nombre, grupo muscular?, notas |
| **PlantillaRutina** | Modelo N días | nombre, dias[] |
| **RutinaAsignada** | Copia del afiliado | afiliadoId, snapshot, asignadaPor, activa |
| **RegistroCumplimiento** | Ejecución | rutinaAsignadaId, dia, series hechas, descansos, tiempoEjecucion |
| **Medicion** | Progreso opcional | afiliadoId, fecha, métricas |
| **FotoProgreso** | Progreso opcional | afiliadoId, fecha, ref archivo |

### 2.8 Notificaciones

| Entidad | Responsabilidad | Atributos clave |
|---------|-----------------|-----------------|
| **PlantillaNotificacion** | Texto por evento | codigoEvento, asunto, cuerpo, activa |
| **PreferenciaNotificacion** | Opt-out | usuarioId, codigoEvento, canal, habilitada |
| **Notificacion** | Envío/registro | destinatario, canal, estado, payload, inAppLeida |

### 2.9 Auditoría

| Entidad | Responsabilidad | Atributos clave |
|---------|-----------------|-----------------|
| **EventoAuditoria** | Quién/qué/cuándo | actorId, accion, entidad, antes/después, timestamp |

---

## 3. Relaciones clave

```text
Tenant 1──* Sucursal
Tenant 1──* Servicio
Servicio(POR_SESIONES) 1──* Sesion
ReglaRecurrencia 1──* Sesion

Tenant 1──* Pack
Pack *──* Servicio (componentes / créditos por servicio)

Afiliado 1──* Contratacion
Contratacion *──1 Pack

Sesion 1──* Reserva
Sesion 1──* ListaEsperaItem
Reserva *──1? Pago
Contratacion *──* Pago

Afiliado 1──* IntentoIngreso
IntentoIngreso *──1? Sesion

PlantillaRutina 1──* RutinaAsignada
Afiliado 1──* RutinaAsignada

UsuarioStaff *──* Rol *──* Permiso
```

---

## 4. Estados relevantes

### Pago

`pendiente` → `aprobado` | `rechazado` | `reembolsado`

### Reserva

Borrador conceptual: `pendiente_pago` → `confirmada` | `cancelada` | `asistio` | `no_show`  
(En MVP, la confirmación ocurre solo con pago aprobado; `pendiente_pago` puede ser efímero.)

### Contratacion

`activa` | `vencida` | `cancelada` | `reembolsada`

### IntentoIngreso

`permitido` | `denegado`

### Lista de espera

`en_cola` | `ofertado` | `confirmado` | `expirado` | `cancelado`  
(según modo del gym)

---

## 5. Diagramas de contexto (negocio)

### Compra y derecho

```text
Afiliado → elige Pack/Drop-in → Pago (MP|Caja)
         → Pago aprobado → Contratacion y/o Reserva
```

### Ingreso

```text
QR/SSI (adapter) → identidad afiliado+tenant
                 → GymBro evalúa Contratacion + tolerancia + sesión/cupo
                 → IntentoIngreso + (Presente en Sesión si aplica)
```

### Pack mixto

```text
Pack compuesto
 ├── componente AccesoLibre (vigencia mensual)
 └── componente Creditos (N, vencimiento según pack)
Cancelación/reembolso del pack → caen ambos componentes
```

---

## 6. Notas de implementación (no normativas de negocio)

- Multi-tenant: **todo** dato de negocio lleva `tenantId` (o equivalente).
- Idempotencia: `idempotencyKey` única por intento de cobro de negocio.
- Adapter de acceso: interfaz estable; Quark es la primera implementación.
- Sucursal: FK lista desde MVP aunque la UI muestre una sola.
- Roles afiliado vs staff: **no** mezclar en un solo perfil de app.

---

[Índice](./00-indice.md) · [Siguiente: Reglas de negocio →](./04-reglas-de-negocio.md)
