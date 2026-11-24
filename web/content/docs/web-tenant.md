# Web del tenant

La **Web del tenant** es la página pública del local, donde visitantes pueden conocer la propuesta y acceder a las opciones que el local publica. El staff la administra desde **Sistema → Web pública** (`/dashboard/web`). La URL pública usa el subdominio del tenant y **Ver mi web** abre la versión publicada.

El editor permite administrar la portada, sliders, imágenes, enlaces y vista previa de la página pública. **Mi portal** es un recorrido separado para afiliados; sus capturas e instrucciones están en [`Portal de afiliados y usuarios`](/docs/portal-afiliados).

## Identidad visual

- **Color principal:** se aplica a botones, enlaces y elementos de marca.
- **Ícono de la organización:** reemplaza la letra de marca en la web, el ícono del dashboard y el favicon del subdominio.
- Los temas claro y oscuro de la web usan el mismo contenido, con presentación adaptada al tema.

## Portada y sliders

La portada puede tener título, subtítulo e imagen opcional. Las imágenes aceptadas son JPG, PNG o WebP y deben tener al menos **1200 px de ancho**. Agregá una descripción accesible y ajustá el enfoque horizontal y vertical para decidir qué parte se conserva al recortar.

Podés agregar hasta **5 sliders**, con hasta **10 slides** en cada uno. Los slides rotan automáticamente cada 6 segundos; podés cambiar su orden y editar título, texto e imagen. Cada imagen permite configurar colores para tema claro y oscuro, texto claro/oscuro, una capa de contraste y el color del título. Si el contraste no alcanza, el editor avisa y bloquea la publicación hasta corregirlo.

Un slide puede llevar botón hacia los planes, reserva de clases en el portal, un pack específico o una URL externa HTTPS. Revisá la vista previa en los dos temas antes de publicar.

## Publicar y volver al diseño por defecto

**Publicar** guarda los cambios y los hace visibles en la web del tenant. Se necesita el permiso `tenant.settings.write`; con permisos de solo lectura se puede consultar el contenido, pero no publicarlo.

El bloque de planes aparece debajo del contenido. Los botones hacia packs dependen de que el pack siga activo; los pagos online requieren que Mercado Pago esté conectado. Los enlaces a redes sociales se administran por separado en la misma sección de Web pública.

**Volver a la vidriera por defecto** es una acción destructiva: borra portada, sliders, ícono e imágenes asociadas; la web vuelve a mostrar el nombre del tenant y sus planes. Usala solo si realmente querés descartar el contenido publicado.

**Capturas del editor:** `editor-web-tennant.png` y `editor-web-tennant-2.png` — editor y vista previa; la segunda imagen va debajo de la primera.  
**Dónde:** Sistema → Web pública, editor del tenant.  
**Qué se ve:** edición y vista previa de la página pública.

**Capturas de la web publicada:** `web-tennant.png` y `web-tennant-2.png` — landing pública del tenant; la segunda imagen va debajo de la primera.  
**Dónde:** web pública del local ya publicada.  
**Qué se ve:** la landing final, no Mi portal.
