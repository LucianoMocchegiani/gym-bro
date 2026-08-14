# Propuesta de Documentación - Plataforma SaaS para Gimnasios

## Objetivo

Construir un **Software Requirements Specification (SRS)** completo que
sirva como base para el desarrollo del producto.

------------------------------------------------------------------------

# Plan de trabajo

## Fase 1 - Definir el negocio

Esta etapa define qué producto se va a construir.

### Contenido

1.  Visión del producto
2.  Objetivos
3.  Problemas que resuelve
4.  Actores
5.  Modelo de negocio (SaaS)
6.  Módulos
7.  Roadmap

**Resultado esperado**

Tener completamente definido el alcance y la propuesta de valor.

------------------------------------------------------------------------

## Fase 2 - Diseñar el dominio

Se identifican las entidades principales del sistema y sus relaciones.

Ejemplo:

``` text
Gimnasio
├── Sucursales
├── Afiliados
├── Profesores
├── Actividades
├── Planes
├── Pagos
├── Caja
├── Accesos
├── Rutinas
└── Noticias
```

Ejemplo de relación:

``` text
Afiliado
    ↓
Tiene un Plan
    ↓
Genera Cuotas
    ↓
Realiza Pagos
```

**Resultado esperado**

Modelo conceptual del sistema y base para la futura base de datos.

------------------------------------------------------------------------

## Fase 3 - Reglas de negocio

Documentar todas las reglas que condicionan el funcionamiento del
sistema.

### Accesos · Planes · Pagos (preguntas → reglas)

Las respuestas cerradas están en [`04-reglas-de-negocio.md`](./04-reglas-de-negocio.md)
(p. ej. RN-ACC-005 tolerancia, RN-TEN-004, RN-PAG-*).

**Resultado esperado**

Evitar ambigüedades y errores durante el desarrollo.

------------------------------------------------------------------------

## Fase 4 - Casos de uso

Los casos de uso viven en [`docs/05-casos-de-uso/`](./05-casos-de-uso/README.md)
(plantilla en [`00-indice.md`](./00-indice.md)). Algunos del núcleo MVP:

| ID | Nombre | Archivo |
|----|--------|---------|
| CU-AFI-001 | Registrar afiliado | [afiliados.md](./05-casos-de-uso/afiliados.md) |
| CU-CON-001 | Comprar pack / mensualidad | [servicios-sesiones-packs.md](./05-casos-de-uso/servicios-sesiones-packs.md) |
| CU-RES-001 | Reservar sesión | [servicios-sesiones-packs.md](./05-casos-de-uso/servicios-sesiones-packs.md) |
| CU-PAG-001 | Pagar con Mercado Pago | [pagos-caja.md](./05-casos-de-uso/pagos-caja.md) |
| CU-PAG-002 | Cobrar en caja | [pagos-caja.md](./05-casos-de-uso/pagos-caja.md) |
| CU-ACC-001 | Verificar ingreso (OID4VP) | [acceso-qr.md](./05-casos-de-uso/acceso-qr.md) |
| CU-ACC-004 | Pase manual | [acceso-qr.md](./05-casos-de-uso/acceso-qr.md) |
| CU-ACC-005 | Historial de ingresos | [acceso-qr.md](./05-casos-de-uso/acceso-qr.md) |
| CU-ROL-001 | Crear tenant (Super) | [roles-permisos.md](./05-casos-de-uso/roles-permisos.md) |
| CU-RUT-003 | Asignar rutina | [rutinas.md](./05-casos-de-uso/rutinas.md) |
| CU-NOT-001 | Notificación de evento | [notificaciones.md](./05-casos-de-uso/notificaciones.md) |

**Resultado esperado**

Casos de uso por módulo (AFI, SER/RES/CON, PAG, ACC, RUT, NOT, ROL), no un
conteo artificial de “100+”.

------------------------------------------------------------------------

## Fase 5 - UX y Wireframes

Diseño de todas las pantallas del sistema.

-   Portal Administrativo
-   Aplicación móvil
-   Portal del afiliado

------------------------------------------------------------------------

# Diferenciadores del producto

La plataforma debería destacar por:

-   Plataforma 100% Web + App.
-   Arquitectura SaaS Multi-Tenant.
-   Marca blanca (White Label).
-   Plataforma modular.
-   Control de acceso integrado.
-   Pagos online.
-   Autogestión del afiliado.
-   Preparada para IA.
-   Preparada para integración con Smartwatch y dispositivos fitness.

------------------------------------------------------------------------

# Documento Maestro del Producto

Este será el documento principal del proyecto.

## Índice

1.  Introducción
2.  Visión del producto
3.  Objetivos
4.  Problemas que resuelve
5.  Público objetivo
6.  Modelo de negocio SaaS
7.  Diferenciadores competitivos
8.  Módulos del sistema
9.  Actores
10. Roadmap

------------------------------------------------------------------------

# Entregables finales

-   Documento SRS completo.
-   Casos de uso.
-   Modelo de datos.
-   Diagramas UML.
-   Arquitectura.
-   Diseño de APIs.
-   Wireframes.
-   Historias de usuario.
-   Casos de prueba.
-   Roadmap de evolución.

---

[Índice](./00-indice.md) · [Siguiente: Resumen SaaS (antecedente) →](./Plataforma_SaaS_Gestion_Gimnasios_Resumen.md)
