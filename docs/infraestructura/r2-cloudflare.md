# Cloudflare R2 — Infraestructura

> Última actualización: Ago 2026  
> Bucket: `labs` | Cuenta: `674db05c358d5855a788013c2e35d533`

## Qué es R2

Cloudflare R2 es un servicio de almacenamiento de objetos compatible con S3. Se usa para almacenar archivos estáticos (imágenes, documentos) que la aplicación necesita servir.

## Qué le aporta al proyecto GymBro

### 1. Almacenamiento de imágenes
- **Servicios**: fotos de cada servicio del gym
- **Packs**: imágenes de packs de entrenamiento
- **Afiliados**: fotos de perfil de los socios
- **Staff**: fotos de perfil del personal
- **Tenants**: logos de los gimnasios

### 2. CDN global (incluido)
- Cloudflare sirve las imágenes desde edge locations worldwide
- Cache automático: primer request va al bucket, siguientes desde el edge más cercano
- Sin configuración adicional, funciona desde que se sube el archivo

### 3. HTTP cache (incluido)
- Cloudflare envía headers `Cache-Control` automáticamente
- El browser cachea imágenes localmente
- No vuelve a pedir la misma imagen si no expiró
- **Ahorro de ancho de banda y carga más rápida**

### 4. URLs públicas
- Cada imagen tiene una URL pública estable: `https://pub-7366ecffdeee44e0b7c6f18a75788312.r2.dev/{key}`
- No necesita signed URLs ni autenticación para lectura
- Compatible con `<img>`, CSS `background-image`, etc.

### 5. Delete gratis
- Eliminar archivos no tiene costo
- Facilita limpieza de imágenes huérfanas o reemplazadas

### 6. Free tier generoso
- 10 GB de storage (suficiente para miles de gyms)
- 10M de lecturas/mes
- 1M de escrituras/mes
- Transferencia siempre gratis
- Ver [costos detallados](../costos/r2-cloudflare.md)

## Arquitectura actual

```
┌─────────────┐     POST /upload     ┌─────────────┐     PUT Object     ┌─────────┐
│  Web (Next) │ ──────────────────── │  API (Nest) │ ────────────────── │  R2     │
│             │                      │             │                    │  Bucket │
└─────────────┘                      └─────────────┘                    │  'labs' │
                                                                       └─────────┘
                                                                            │
                                                                       GET (público)
                                                                            │
                                                                       ┌─────────┐
                                                                       │ Browser │
                                                                       │ (cache) │
                                                                       └─────────┘
```

### Flujo de upload
1. Usuario elige imagen en el form
2. Browser muestra preview local (blob URL, sin upload)
3. Al guardar → `ImageUpload` → `uploadImageToApi(file, folder)`
4. API recibe archivo vía `POST /upload` (multipart)
5. API valida tipo/tamaño → sube a R2 con `@aws-sdk/client-s3`
6. API retorna `{ url, key }` con la URL pública
7. Frontend guarda la URL en el form → envía al endpoint de create/update
8. API persiste `imageUrl` en la DB

### Flujo de lectura
1. Frontend carga entidad (servicio/pack/etc.)
2. API retorna `imageUrl` en el response
3. Frontend renderiza `<img src={imageUrl} />`
4. Browser carga desde R2/Cloudflare CDN (con cache)

## Stack tecnológico

| Componente | Tecnología | Uso |
|-----------|-----------|-----|
| Storage | Cloudflare R2 | Almacenamiento de objetos |
| SDK | `@aws-sdk/client-s3` | Interactuar con R2 desde NestJS |
| Presigning | `@aws-sdk/s3-request-presigner` | URLs temporales (futuro) |
| Bucket | `labs` | Bucket principal |
| Región | auto | R2 elige la región automáticamente |
| Dominio | `pub-7366ecffdeee44e0b7c6f18a75788312.r2.dev` | URL pública del bucket |

## Estructura de carpetas en R2

```
labs/
├── services/       # Imágenes de servicios
├── packs/          # Imágenes de packs
├── members/        # Fotos de perfil de afiliados
├── staff/          # Fotos de perfil del personal
├── tenants/        # Logos de gimnasios
└── trash/          # (futuro) Imágenes marcadas para eliminación
```

## Configuración

### Variables de entorno (API)
```env
R2_ACCOUNT_ID=674db05c358d5855a788013c2e35d533
R2_ACCESS_KEY_ID=<tu-access-key>
R2_SECRET_ACCESS_KEY=<tu-secret-key>
R2_BUCKET=labs
R2_PUBLIC_BASE_URL=https://pub-7366ecffdeee44e0b7c6f18a75788312.r2.dev
```

### Limites actuales
- **Tamaño máximo por archivo**: 5 MB (configurado en `FileInterceptor`)
- **Formatos permitidos**: JPEG, PNG, WebP, GIF
- **Sin rate limiting** en upload (el endpoint requiere auth)

## Seguridad

- **Lectura**: pública (cualquiera con la URL puede ver la imagen)
- **Escritura**: requiere autenticación JWT (staff session)
- **Delete**: no hay endpoint exposeado (solo vía script/admin)
- **No hay**: signed URLs, CORS restrictions, o IP whitelisting

## Métricas monitoreadas

Actualmente no hay monitoreo automático. Para futuro:
- Espacio usado en R2 (dashboard de Cloudflare)
- Número de uploads por día
- Imágenes huérfanas (entidades inactivas con imageUrl)

## Pendiente

- [ ] Lifecycle rule para auto-eliminar imágenes antiguas (opcional)
- [ ] Script de limpieza de imágenes huérfanas
- [ ] Compresión client-side antes de upload
- [ ] Monitoreo de espacio usado
- [ ] Rate limiting en endpoint de upload
- [ ] Validación de content-type real (no solo MIME del browser)

## Ver también

- [Costos de R2](../costos/r2-cloudflare.md)
- [Limpieza de imágenes](../../local/tareas%20flatantes/optimizar-imagenes-r2.md)
