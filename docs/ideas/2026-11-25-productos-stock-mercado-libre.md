# Productos, stock y Mercado Libre — propuesta por etapas

**Fecha:** 2026-11-25  
**Fuente:** definición con el usuario  
**Estado:** revisada; alcance inicial pendiente de cerrar  
**Tema:** productos · inventario · caja · Mercado Libre  
**Relacionado:** [idea previa de tienda y marketplaces](./2026-07-13-stores-mp-vs-ml.md)

## Objetivo

Permitir que cada organización gestione productos y existencias desde Faciliter. El catálogo interno funciona aunque la organización no use Mercado Libre; quien lo elija podrá conectar su cuenta y publicar productos desde el mismo catálogo.

**Principio propuesto:** Faciliter es la fuente de verdad del producto y del stock. Mercado Libre es un canal externo opcional, no un requisito para cargar o vender productos.

## Productos comerciales y recorrido por plan

La oferta de Faciliter contempla tres opciones para una organización:

- **Faciliter Club:** el producto actual para clubes, gimnasios y estudios.
- **Faciliter E-commerce:** productos, stock y ventas para comercios, sin los módulos propios de Club.
- **Faciliter Club + E-commerce:** ambos conjuntos de funcionalidades habilitados para la misma organización.

El plan contratado determina qué funcionalidades puede usar la organización. La disponibilidad debe respetarse tanto en la navegación como en las acciones del backend; ocultar una opción del menú por sí solo no alcanza.

### Faciliter Club

La experiencia actual de Club se conserva: afiliados, servicios, sesiones, reservas, Caja y las funciones asociadas a accesos y credenciales. Este documento no propone reemplazar esos módulos.

### Faciliter E-commerce

Al contratar solo E-commerce, el recorrido esperado es administrar el catálogo propio y vender sus productos desde Caja:

1. La navegación muestra un módulo nuevo de **Productos**.
2. El módulo reutiliza desde el frontend la grilla y los componentes existentes, con información del producto y acciones para ver detalle, editar y eliminar.
3. Desde Caja se buscan productos por nombre o código en un catálogo paginado. No se ofrece el selector de servicios ni los débitos automáticos.
4. La interfaz usa **Clientes** en lugar de **Afiliados**. La venta de productos no debe crear contratos ni habilitar funciones de Club.
5. El control de stock forma parte del alcance básico; el flujo para ingresar y ajustar existencias sigue pendiente de definición.

En este plan quedan fuera los módulos de accesos y credenciales (incluidos ZKTeco y Kuatia en Staff), Afiliados, Configuración de Club, Services/Servicios, Sesiones, Mi credencial, Puerta, Vencimientos y débitos automáticos.

### Faciliter Club + E-commerce

La organización puede usar las funcionalidades de Club y E-commerce en una misma cuenta: productos y stock además de los módulos de Club. Los productos se venden sin convertirse en servicios ni generar contratos; el carrito mixto con productos y líneas de Club se define en la etapa 3.

Queda por decidir cómo se nombra a las personas en esta experiencia combinada: **Afiliados**, **Clientes** o ambos según el contexto. No se renombrarán tablas ni APIs de Club solo por cambiar los textos visibles.

## Etapas

### 1. Catálogo interno y stock

- Crear y administrar productos por organización, con nombre, descripción opcional, precio y cantidad disponible.
- Incluir una imagen principal opcional por producto. Reutilizar la funcionalidad existente de carga a Cloudflare R2 y guardar la referencia de la imagen en el producto; confirmar los límites y permisos existentes al implementar.
- Registrar movimientos de stock (por ejemplo, ingreso, ajuste y salida por venta) para conservar trazabilidad.
- Alcance inicial propuesto: una existencia por organización, sin variantes ni stock separado por sucursal.
- Permitir el borrado físico solo si el producto nunca se usó en una venta. Si ya tiene ventas asociadas, impedir el borrado y permitir darlo de baja/archivarlo para preservar el historial.
- Definir antes de implementar cómo se manejará el stock disponible al dar de baja un producto.

### 2. Venta de productos en Caja

- Buscar y agregar productos a Caja y completar ventas de productos sin crear contratos de servicios.
- Conservar en cada línea de venta una copia del nombre y del precio del producto al momento de la operación, para que el historial no cambie si luego se edita o archiva el producto.
- Descontar existencias y registrar venta/caja de forma consistente, evitando ventas por encima del stock disponible.
- Empezar con los medios de pago sencillos que ya soporte Caja; dejar Mercado Pago para la etapa de carrito mixto.
- Confirmar antes de implementar si se permitirán ventas sin asociar un afiliado y cómo se tratarán devoluciones.

### 3. Carrito mixto y cobros existentes

- Combinar productos con packs o servicios en el mismo carrito, sin cambiar el significado de cada línea.
- Las líneas de producto no crean contratos; la activación de contratos se limita a las líneas que los requieren.
- Integrar los productos al flujo de Mercado Pago existente.
- Resolver pago pendiente con reserva/confirmación/liberación de stock e idempotencia, para evitar vender dos veces la última unidad o descontar dos veces.

### 4. Conexión opcional con Mercado Libre

- Conectar la cuenta vendedora de cada organización mediante OAuth, separado de las credenciales y la integración de Mercado Pago.
- Permitir seleccionar qué productos internos vincular/publicar y conservar una referencia a su publicación.
- Antes de habilitar publicación, investigar y validar con la API vigente los requisitos y restricciones por categoría, atributos, variantes, imágenes, permisos y cuenta vendedora. No asumir que todos los productos se pueden publicar igual.
- Esta etapa prepara y valida la integración; no implica todavía sincronización completa de ventas.

### 5. Publicación y sincronización bidireccional

- Crear y actualizar publicaciones desde Faciliter, incluyendo al menos precio y stock según lo que permita la API de Mercado Libre.
- Recibir las órdenes generadas en Mercado Libre y reflejarlas en Faciliter para descontar stock una sola vez.
- Tratar notificaciones/reintentos de forma idempotente y dejar visibles los errores de sincronización para poder corregirlos.
- Registrar las ventas del marketplace como ventas de ese canal; no asumir que el dinero se recibió en la caja física del gimnasio.

## Fuera del alcance inicial

- Tienda pública propia o checkout para socios: es un canal distinto y puede definirse por separado.
- Variantes, códigos de barras, múltiples depósitos/sucursales y reglas avanzadas de inventario.
- Integrar otros marketplaces además de Mercado Libre.

## Criterios para avanzar

- La etapa 1 debe ser útil sin Mercado Libre.
- No habilitar venta de stock compartido en canales concurrentes hasta contar con una estrategia de reserva y recepción de órdenes.
- Validar las limitaciones concretas de Mercado Libre contra la documentación/API vigente y las categorías que realmente quieran vender; las reglas pueden cambiar.

## Decisiones pendientes

1. ¿Se puede vender sin afiliado asociado?
2. ¿Qué política de devolución y reposición de stock se necesita?
3. ¿Se requiere SKU/código de barras desde el primer corte?
4. ¿Qué categorías de productos deben soportarse primero en Mercado Libre?
5. ¿Qué permisos del plan habilitan catálogo, stock y conexión al marketplace?
6. ¿Cómo se nombran las personas en el plan combinado: Afiliados, Clientes o ambos según el contexto?
7. ¿Cómo se cargan y ajustan existencias, y qué ocurre con el stock al dar de baja un producto?

Estas etapas son una propuesta de alcance; antes de implementar cada una, cerrar sus decisiones y contrastar los puntos de integración con el código y la documentación vigentes.

---

[Ideas](./README.md) · [Índice docs](../00-indice.md)