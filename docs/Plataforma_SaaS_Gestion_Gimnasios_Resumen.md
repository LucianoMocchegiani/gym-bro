# Plataforma SaaS para Gestión de Gimnasios

## 1. ¿Qué es el producto?

No es una aplicación para un único gimnasio, sino una **plataforma SaaS
multi-tenant** donde cada gimnasio administra su propio espacio.

``` text
Plataforma
├── Gimnasio A
├── Gimnasio B
└── Gimnasio C
```

Cada gimnasio solo accede a su propia información.

## 2. Usuarios

### Super Administrador

-   Crear gimnasios
-   Suspender gimnasios
-   Gestionar planes
-   Métricas
-   Soporte
-   Personalización

### Administrador del gimnasio

-   Afiliados
-   Profesores
-   Actividades
-   Planes
-   Cuotas
-   Pagos
-   Caja
-   Reportes
-   Configuración

### Profesor

-   Ver alumnos
-   Tomar asistencia
-   Cargar rutinas
-   Agenda
-   Progreso

### Afiliado

-   Ver plan
-   Pagar cuotas
-   Reservar clases
-   Ver historial
-   QR de ingreso
-   Progreso
-   Noticias

## 3. Módulos

### Administración

-   Afiliados
-   Profesores
-   Actividades
-   Planes
-   Cuotas
-   Pagos
-   Caja
-   Reportes

### Autogestión

-   Perfil
-   Estado de cuenta
-   Plan contratado
-   Rutinas
-   Reservas
-   QR
-   Historial

### Control de acceso

Flujo: QR → ¿Cuota al día? → Sí → Abrir molinete → Registrar ingreso. Si
la cuota no está al día, se deniega el acceso.

## 4. Personalización

Cada gimnasio podrá configurar: - Logo - Colores - Nombre - Icono -
Dirección - Horarios - Redes sociales - WhatsApp - Módulos habilitados -
Métodos de pago

## 5. Planes del SaaS

### Starter

-   Hasta 100 afiliados
-   Gestión
-   Pagos
-   QR

### Pro

Todo Starter + - Reservas - Rutinas - Estadísticas - Profesores

### Premium

Todo Pro + - Smartwatch - API - Branding completo - Notificaciones

## 6. Roadmap

### Fase 1

-   Gestión de afiliados
-   Cuotas
-   Pagos
-   QR
-   Login
-   Perfil
-   Reportes

### Fase 2

-   Reservas
-   Rutinas
-   Profesores
-   Chat
-   Notificaciones

### Fase 3

-   Nutrición
-   Mediciones
-   Fotos de progreso
-   IMC

### Fase 4

-   Noticias Fitness
-   Comunidad
-   Ranking
-   Desafíos

### Fase 5

-   Apple Health
-   Google Fit
-   Garmin
-   Fitbit
-   Samsung Health
-   Wear OS
-   Apple Watch

### Fase 6

-   IA para rutinas
-   IA para alimentación
-   Corrección de ejercicios
-   Recomendaciones

## 7. Arquitectura conceptual

``` text
Super Administrador
        │
 ┌──────┼──────┐
Gym A  Gym B  Gym C
```

## 8. Entidades principales

-   Gimnasio
-   Usuario
-   Rol
-   Afiliado
-   Profesor
-   Plan
-   Membresía
-   Cuota
-   Pago
-   Actividad
-   Clase
-   Reserva
-   Asistencia
-   Rutina
-   Ejercicio
-   Medición física
-   Ingreso
-   Dispositivo de acceso
-   Notificación
-   Noticia
-   Configuración del gimnasio
-   Suscripción del gimnasio
-   Integración con smartwatch

## Visión

El producto debe concebirse como un **ERP + CRM + App para gimnasios**,
preparado para venderse como servicio a múltiples clientes y crecer
mediante módulos e integraciones.

---

[Índice](./00-indice.md) · Antecedente — la fuente de verdad es el [Documento maestro](./01-documento-maestro.md)
