# Web del tenant

La **Web del tenant** es la página pública del local y el punto de entrada al portal del afiliado. El staff la administra desde **Sistema → Web del gym** (`/dashboard/web`). La URL pública usa el subdominio del tenant. El botón **Ver mi web** abre la página publicada.

La persona afiliada inicia sesión con su cuenta Faciliter y entra a **Mi portal**. Allí puede consultar clases, reservas, tienda, carrito, historial, documentos y avisos según su acceso. La app móvil no es el recorrido general del afiliado; la excepción vigente es escanear el QR de la puerta Kuatia.

## Identidad visual

- **Color principal:** se aplica a botones, enlaces y elementos de marca.
- **Ícono del gimnasio:** reemplaza la letra de marca en la web, el ícono del dashboard y el favicon del subdominio.
- Los temas claro y oscuro de la web usan el mismo contenido, con presentación adaptada al tema.

## Portada y sliders

La portada puede tener título, subtítulo e imagen opcional. Las imágenes aceptadas son JPG, PNG o WebP y deben tener al menos **1200 px de ancho**. Agregá una descripción accesible y ajustá el enfoque horizontal y vertical para decidir qué parte se conserva al recortar.

Podés agregar hasta **5 sliders**, con hasta **10 slides** en cada uno. Los slides rotan automáticamente cada 6 segundos; podés cambiar su orden y editar título, texto e imagen. Cada imagen permite configurar colores para tema claro y oscuro, texto claro/oscuro, una capa de contraste y el color del título. Si el contraste no alcanza, el editor avisa y bloquea la publicación hasta corregirlo.

Un slide puede llevar botón hacia los planes, reserva de clases en el portal, un pack específico o una URL externa HTTPS. Revisá la vista previa en los dos temas antes de publicar.

## Publicar y volver al diseño por defecto

**Publicar** guarda los cambios y los hace visibles en la web del tenant. Se necesita el permiso `tenant.settings.write`; con permisos de solo lectura se puede consultar el contenido, pero no publicarlo.

El bloque de planes aparece debajo del contenido. Los botones hacia packs dependen de que el pack siga activo; los pagos online requieren que Mercado Pago esté conectado. Los enlaces a redes sociales se administran por separado en la misma sección de Web del gym.

**Volver a la vidriera por defecto** es una acción destructiva: borra portada, sliders, ícono e imágenes asociadas; la web vuelve a mostrar el nombre del tenant y sus planes. Usala solo si realmente querés descartar el contenido publicado.

**Captura:** `inicio-portal.png` — lista.  
**Dónde:** web pública del tenant, página de inicio.  
**Qué se ve:** portada y planes, antes de entrar al portal.

**Captura:** `inico-portal-2.png` — lista.  
**Dónde:** Mi portal, inicio de sesión de un afiliado.  
**Qué se ve:** inicio del afiliado; usar solo con datos de prueba o anonimizados.

**Captura:** `portal-tienda.png` — lista.  
**Dónde:** Mi portal → Tienda.  
**Qué se ve:** packs disponibles.

**Captura:** `portal-clases.png` — lista.  
**Dónde:** Mi portal → Clases.  
**Qué se ve:** calendario y clases disponibles.

**Captura:** `portal-mis-clases.png` — lista.  
**Dónde:** Mi portal → Mis clases.  
**Qué se ve:** reservas del afiliado.

**Captura:** `portal-carrito.png` — lista.  
**Dónde:** Mi portal → Carrito.  
**Qué se ve:** productos seleccionados antes de pagar.

**Captura:** `portal-historial.png` — lista.  
**Dónde:** Mi portal → Historial.  
**Qué se ve:** comprobantes del afiliado.

**Captura:** `portal-acceso.png` — lista.  
**Dónde:** Mi portal → Acceso.  
**Qué se ve:** la credencial según la modalidad configurada para el tenant.

**Captura:** `portal-avisos.png` — lista.  
**Dónde:** Mi portal → Avisos.  
**Qué se ve:** bandeja de avisos del afiliado.

**Captura:** `web-web-del-gym.png` — falta.  
**Dónde:** Sistema → Web del gym, portada con imagen y un slider editado.  
**Qué se ve:** editor, vista previa y acciones de publicación.
