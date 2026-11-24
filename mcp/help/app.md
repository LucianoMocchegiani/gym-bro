# Portal web del afiliado y app Faciliter

El afiliado puede usar **Mi portal** en `{slug}.faciliter.xyz/portal` con su cuenta Faciliter; no necesita instalar la app GymBro. Si también tiene perfil de staff, entra al panel desde la misma cuenta.

## Mi portal

- **Inicio:** próximas clases, planes vigentes y avisos nuevos.
- **Clases:** calendario del mes; reservar con crédito, comprar una clase suelta o entrar a la lista de espera.
- **Mis clases:** próximas reservas, listas de espera y clases pasadas.
- **Tienda** y **Carrito:** packs y clases sueltas; pago online con Mercado Pago si el tenant lo conectó.
- **Historial:** comprobantes de pagos realizados en portal, app o Caja; permite solicitar devolución.
- **Documentos:** notas y archivos de su carpeta, solo lectura.
- **Avisos:** bandeja y preferencias de correo.
- **Acceso:** gestiona la credencial según el sistema configurado por el tenant. Para Kuatia, la oferta se acepta en Kuatia Wallet; ZKTeco muestra el identificador existente vinculado o el DNI de respaldo.

La puerta Kuatia se puede usar con **Kuatia Wallet web**: se escanea con la cámara del teléfono el QR que muestra Puerta, o se abre un link compartido. La app GymBro no es necesaria para presentar ese QR. Para ZKTeco o sin control de acceso, el portal alcanza para el uso habitual.

**Mi cuenta** (`/cuenta`, desde el avatar): datos, cambiar o crear contraseña y cerrar sesión.

## App GymBro

La app móvil sigue disponible como alternativa para las funciones del afiliado: Inicio, Sesiones, Tienda, Carrito, Historial, Documentos, Avisos y Ajustes. La puerta Kuatia ya no depende de ella; la presentación usa Kuatia Wallet web.

## Web pública del tenant

Cada tenant tiene una página pública en `{slug}.faciliter.xyz` con portada y planes. El visitante puede ver las ofertas y, cuando el tenant habilitó compra online, iniciar una compra. Configuración y publicación: `/docs/web-tenant`.

## Ayuda

- Configuración OAuth de Mercado Pago y Point QR: `/docs/config`.
- Web del tenant: `/docs/web-tenant`.
- Operación de la puerta: topic `puerta`.

