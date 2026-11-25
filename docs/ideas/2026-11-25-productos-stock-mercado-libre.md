# Productos, stock y Mercado Libre — propuesta por etapas

**Fecha:** 2026-11-25  
**Fuente:** definición con el usuario  
**Estado:** revisada; alcance inicial pendiente de cerrar  
**Tema:** productos · inventario · caja · Mercado Libre  
**Relacionado:** [idea previa de tienda y marketplaces](./2026-07-13-stores-mp-vs-ml.md)

## Objetivo

Permitir que cada organización gestione productos y existencias desde Faciliter. El catálogo interno funciona aunque la organización no use Mercado Libre; quien lo elija podrá conectar su cuenta y publicar productos desde el mismo catálogo.

**Principio propuesto:** Faciliter es la fuente de verdad del producto y del stock. Mercado Libre es un canal externo opcional, no un requisito para cargar o vender productos.

## Etapas

### 1. Catálogo interno y stock

- Crear y administrar productos por organización, con nombre, descripción opcional, precio y cantidad disponible.
- Incluir una imagen principal opcional por producto. Reutilizar la funcionalidad existente de carga a Cloudflare R2 y guardar la referencia de la imagen en el producto; confirmar los límites y permisos existentes al implementar.
- Registrar movimientos de stock (por ejemplo, ingreso, ajuste y salida por venta) para conservar trazabilidad.
- Alcance inicial propuesto: una existencia por organización, sin variantes ni stock separado por sucursal.

### 2. Venta de productos en Caja

- Buscar y agregar productos a Caja y completar ventas de productos sin crear contratos de servicios.
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

Estas etapas son una propuesta de alcance; antes de implementar cada una, cerrar sus decisiones y contrastar los puntos de integración con el código y la documentación vigentes.

---

[Ideas](./README.md) · [Índice docs](../00-indice.md)
