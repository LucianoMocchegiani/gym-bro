# Google OAuth — Flujo escalado para subdominios dinámicos

**Índice:** [99-backlog-post-mvp.md](../99-backlog-post-mvp.md)
**Estado:** Propuesto — no implementado
**Prioridad:** Baja (cuando haya >10 tenants o eCommerce con login de afiliado)

---

## Problema

Google Cloud Console limita la cantidad de **authorized origins** y **redirect URIs** por OAuth client ID (~100). Con subdominios dinámicos (`{slug}.faciliter.xyz`), registrar cada uno manualmente no escala.

**Estado actual:**
- Login admin web: email/password funciona ✅
- Login Google mobile: funciona ✅ (Google Sign-In SDK, sin origin check)
- Login Google admin web: **roto** — el origin `gym-de-prueba.faciliter.xyz` no está registrado en Google Cloud Console
- Solución temporal: agregar origins manuales en Google Cloud Console (no escala)

## Solución propuesta: OAuth Proxy con dominio fijo

Un dominio fijo (`login.faciliter.xyz`) actúa como proxy de autenticación Google. Todos los subdominios redirigen a él para autenticarse. Un solo origin/redirect_uri en Google Cloud Console cubre todos los tenants.

## Extensión: Soporte para tenants con dominio propio (Opción B)

La solución de cookie `.faciliter.xyz` funciona perfectamente para subdominios del mismo dominio principal. Pero si un tenant quiere usar un dominio completamente diferente (ej. `gym-cliente.com`), la cookie `.faciliter.xyz` no viajará a su dominio, y el tenant no podrá reconocer al usuario autenticado.

Para ese caso se añade un mecanismo de validación server-to-server (Opción B).

### Flujo extendido para dominio propio

**Paso 1: Redirección desde dominio propio**

El usuario hace clic en "Iniciar sesión con Google" en `https://gym-cliente.com`. El frontend redirige a:
```
https://login.faciliter.xyz/start?return_to=https://gym-cliente.com/dashboard
```

**Paso 2-4: Igual que el flujo detallado más abajo**

El backend de `login.faciliter.xyz` genera el state, redirige a Google, recibe el callback, intercambia el code, valida el ID Token, busca/crea identidad, y crea la sesión central. (Ver "Flujo detallado" para los pasos 2-4 completos.)

**Paso 5: Redirección al dominio propio con flag de verificación**

A diferencia de los subdominios, aquí el backend central no puede confiar en la cookie para que el tenant reconozca al usuario. Entonces:

- Setea la cookie central `central_session` vinculada a `login.faciliter.xyz` con `SameSite=None; Secure; HttpOnly`
- Redirige al usuario a `return_to` con un flag: `https://gym-cliente.com/dashboard?auth_check=1`
- No se incluye ningún token en la URL (a diferencia de la Opción A)

**Paso 6: El dominio propio detecta el flag y llama al backend central**

El frontend del tenant detecta `?auth_check=1` y ejecuta:
```javascript
fetch('https://login.faciliter.xyz/session/verify', {
  method: 'GET',
  credentials: 'include'  // Envía la cookie central_session
})
```
El navegador envía automáticamente la cookie `central_session` porque la solicitud va dirigida a `login.faciliter.xyz`.

**Paso 7: El backend central valida y responde con la identidad**

El backend de `login.faciliter.xyz` verifica la cookie, obtiene el ID de usuario, y responde con la identidad:
```json
{
  "user_id": "usr_abc123",
  "email": "user@example.com",
  "name": "Juan Pérez",
  "google_sub": "1234567890"
}
```

**Paso 8: El tenant crea su propia sesión local**

El frontend del tenant envía esa identidad a su propio backend (`gym-cliente.com/api/auth/session`). El backend del tenant:

- Verifica que la solicitud proviene de su propio frontend
- Crea una sesión local bajo `gym-cliente.com`
- Setea su propia cookie local: `Set-Cookie: tenant_session=abc; Domain=gym-cliente.com; Secure; HttpOnly`

A partir de aquí, el usuario lleva la cookie local del tenant y no depende del backend central.

> **Si el tenant no puede implementar `/session/verify`**: la única alternativa es que registre su propio Client ID en Google Cloud Console con su dominio (`gym-cliente.com`). Esto implica crear un client independiente por tenant. No escala si son muchos tenants, pero es la única opción sin modificar el frontend del tenant.

### Arquitectura: flujo de dominio propio

```
┌─────────────────────────┐
│  https://gym-cliente.com │
│  (dominio propio)        │
│                           │
│  "Iniciar sesión Google" │
│       │ redirect          │
│       ▼                   │
│  login.faciliter.xyz/start│
│  ?return_to=...           │
└─────────────────────────┘
              │ redirect
              ▼
┌─────────────────────────┐
│  login.faciliter.xyz    │
│  (DOMINIO FIJO)         │
│                           │
│  1. Redirige a Google   │──┐
│  2. Callback            │  │
│  3. Intercambia code    │  │
│  4. Valida ID Token     │  │
│  5. Setea cookie        │  │
│     central_session     │  │
│  6. Redirige a          │  │
│     return_with_flag    │  │
│                           │  │
│  Google OAuth           │◄─┘
└─────────────────────────┘
              │ redirect
              ▼
┌─────────────────────────┐
│  https://gym-cliente.com│
│  ?auth_check=1          │
│                           │
│  Frontend detecta flag  │
│  GET /session/verify    │──┐
│  (credentials: include) │  │
│                           │  │
│  Envía identidad a      │  │
│  gym-cliente.com/api/   │  │
│  auth/session           │  │
│                           │  │
│  Backend crea sesión    │  │
│  tenant_session         │  │
│                           │  │
│  → Usuario autenticado  │  │
└─────────────────────────┘    │
                               │
         ┌─────────────────────┤
         │                     │
         ▼                     ▼
┌──────────────────┐ ┌──────────────────┐
│ login.faciliter. │ │ gym-cliente.com  │
│ xyz/session/     │ │ Crea sesión      │
│ verify           │ │ local            │
│ Verifica cookie  │ │ tenant_session   │
│ Response: identity│ │                  │
│ Marca consumida  │ │                  │
└──────────────────┘ └──────────────────┘
```

### Requisitos del endpoint `/session/verify`

El endpoint `GET /session/verify` en `login.faciliter.xyz` debe:

- Verificar el header `Origin`: solo aceptar dominios de tenants autorizados (lista blanca en DB)
- Verificar la cookie `central_session`: debe existir y ser válida
- Marcar la sesión como consumida: una vez que un tenant obtiene la identidad, esa sesión central no debe poder reutilizarse para otro tenant
- Rate limiting: limitar la cantidad de verificaciones por sesión y por tenant
- Responder solo con la identidad mínima necesaria: no exponer tokens de Google ni información sensible adicional

### Cookie central (nuevo — solo para dominios propios)

| Propiedad | Valor | Razón |
|-----------|-------|-------|
| `Domain` | `login.faciliter.xyz` | Solo para el dominio fijo |
| `Path` | `/` | Disponible en todas las rutas |
| `Secure` | `true` | Solo HTTPS |
| `HttpOnly` | `true` | No accesible desde JS |
| `SameSite` | `None` | Necesario para envío cross-site desde dominios propios |

Nota: `SameSite=None` requiere `Secure`. Es la única forma de que la cookie viaje en la solicitud cross-site desde `gym-cliente.com` hacia `login.faciliter.xyz`.

### Seguridad adicional para dominios propios

- El token nunca aparece en la URL: a diferencia de la Opción A (token en query string), aquí el token no es visible ni queda en el historial del navegador
- La cookie central es `HttpOnly`: el frontend del tenant no puede leerla directamente, solo el backend central puede validarla
- La sesión del tenant es independiente: una vez creada, no depende del backend central
- `Origin` verificado: el endpoint `/session/verify` solo responde a dominios de tenants previamente registrados

### Comparación: subdominios vs dominios propios

| Subdominio (`gym.faciliter.xyz`) | Dominio propio (`gym-cliente.com`) |
| --- | --- |
| Mecanismo de sesión: Cookie `.faciliter.xyz` compartida | Mecanismo de sesión: Validación server-to-server (`/session/verify`) |
| El tenant recibe token en URL: No | El tenant recibe token en URL: No |
| Requisito adicional: Ninguno | Requisito adicional: Endpoint `/session/verify` + lista blanca de dominios |
| Complejidad: Baja | Complejidad: Media |
| Independencia del backend central: Sí (cookie compartida) | Independencia del backend central: Sí (sesión local del tenant) |

---

## Arquitectura

```
┌─────────────────────────┐
│  https://gym-de-prueba  │
│  .faciliter.xyz         │
│  (tenant subdomain)     │
│                         │
│  "Iniciar sesión        │
│   con Google"           │
│       │                 │
│       │ redirect         │
│       ▼                 │
│  https://login.faciliter│
│  .xyz/start?            │
│  return_to=...          │
└─────────────────────────┘
              │
              ▼
┌─────────────────────────┐
│  https://login.faciliter│
│  .xyz                   │
│  (DOMINIO FIJO)         │
│                         │
│  1. Genera state        │
│  2. Redirige a Google   │──────┐
│  3. Recibe callback     │      │
│  4. Intercambia code    │      │
│  5. Valida ID Token     │      │
│  6. Crea sesión         │      │
│  7. Setea cookie        │      │
│  8. Redirige return_to  │      │
│                         │      │
│  Google OAuth           │◄─────┘
│  (UN solo redirect_uri: │
│   login.faciliter.xyz/  │
│   callback)             │
└─────────────────────────┘
              │
              │ redirect con cookie
              ▼
┌─────────────────────────┐
│  https://gym-de-prueba  │
│  .faciliter.xyz         │
│                         │
│  Cookie .faciliter.xyz  │
│  disponible automáticamente
│  → usuario autenticado  │
└─────────────────────────┘
```

## Flujo detallado

### Paso 1: Redirección desde subdominio

El usuario hace clic en "Iniciar sesión con Google" en `https://gym-de-prueba.faciliter.xyz`.

El frontend redirige a:
```
https://login.faciliter.xyz/start?return_to=https://gym-de-prueba.faciliter.xyz/dashboard
```

### Paso 2: `/start` en login.faciliter.xyz

El backend:
1. Recibe `return_to`
2. Genera `state` cifrado (contiene `return_to` + timestamp + expiración)
3. Construye la URL de autorización de Google:

```
https://accounts.google.com/o/oauth2/v2/auth?
  client_id={CLIENT_ID}&
  redirect_uri=https://login.faciliter.xyz/callback&
  response_type=code&
  scope=openid email profile&
  state={STATE_ENCRYPTED}
```

4. Redirige al usuario a esa URL

### Paso 3: Autenticación en Google

El usuario se autentica en Google y Google lo redirige a:
```
https://login.faciliter.xyz/callback?code=AUTH_CODE&state=STATE_ENCRYPTED
```

### Paso 4: `/callback` en login.faciliter.xyz

El backend:
1. **Verifica state**: descifra, valida expiración, extrae `return_to`
2. **Intercambia code por tokens** (server-to-server):
   - `POST https://oauth2.googleapis.com/token`
   - `client_id`, `client_secret`, `code`, `redirect_uri`, `grant_type=authorization_code`
3. **Valida ID Token**:
   - Firma contra claves públicas de Google (`google-auth-library`)
   - `aud` = client_id
   - `iss` = `https://accounts.google.com`
   - `exp` no expirado
   - `email` verificado
4. **Busca/crea identidad** en la base de datos (por `email` o `google_sub`)
5. **Crea sesión propia** de la aplicación
6. **Setea cookie**:
   ```
   Set-Cookie: session={SESSION_ID}; Domain=.faciliter.xyz; Path=/; Secure; HttpOnly; SameSite=Lax
   ```
7. **Redirige** al usuario a `return_to`

### Paso 5: Subdominio recibe al usuario

- La cookie `.faciliter.xyz` viaja automáticamente en la solicitud
- El backend del subdominio verifica la cookie
- El usuario está autenticado

## Configuración Google Cloud Console

1. **Tipo de credencial**: Aplicación web
2. **Origen autorizado**: `https://login.faciliter.xyz` (UN solo origin)
3. **Redirect URI**: `https://login.faciliter.xyz/callback` (UN solo redirect_uri)
4. **Scopes**: `openid`, `email`, `profile`

No se necesita agregar nada más. Escala a infinitos subdominios.

## Requisitos técnicos

### Backend (login.faciliter.xyz)

- Endpoint `GET /start` — genera state, redirige a Google
- Endpoint `GET /callback` — recibe code/state, valida, crea sesión, setea cookie
- `google-auth-library` para validación de ID Token
- `googleapis` npm para intercambio de code por tokens
- Encriptación de state (Fernet o similar)
- Persistencia de sesiones (DB o Redis)

### Frontend (subdominios)

- Botón "Iniciar sesión con Google" → redirige a `/start?return_to=...`
- Al volver del callback, verificar cookie (el backend ya lo hace)
- No necesita Google Identity Services SDK

### Cookie de sesión (subdominios)

| Propiedad | Valor | Razón |
|-----------|-------|-------|
| `Domain` | `.faciliter.xyz` | Compartida entre subdominios |
| `Path` | `/` | Disponible en todas las rutas |
| `Secure` | `true` | Solo HTTPS |
| `HttpOnly` | `true` | No accesible desde JS |
| `SameSite` | `Lax` | Protección CSRF |

### State (parámetro)

| Propiedad | Valor | Razón |
|-----------|-------|-------|
| Contenido | `return_to` + timestamp | Para CSRF y retorno |
| Cifrado | Fernet o AES | No legible por el usuario |
| Expiración | 10 minutos | Previne replay attacks |
| Verificación | Backend verifica al callback | Previne CSRF |

## Seguridad

- **State cifrado** → previene CSRF y manipulación
- **Cookie HttpOnly** → no accesible desde XSS
- **Cookie Secure** → solo HTTPS
- **Cookie SameSite=Lax** → protección CSRF básica (subdominios)
- **Cookie SameSite=None** → necesario para cross-site (dominios propios)
- **ID Token validación** → firma, audiencia, emisor, expiración
- **Verificar `return_to`** → solo redirigir a dominios propios (prevenir open redirect)
- **Origin verificado** (`/session/verify`) → solo responde a dominios de tenants registrados

## Archivos a crear/modificar

### Nuevo servicio: `login.faciliter.xyz`

```
auth-proxy/
├── start.ts        → GET /start (genera URL de autorización)
├── callback.ts     → GET /callback (valida, crea sesión, setea cookie)
├── session.ts      → validación de cookie en subdominios
├── utils/
│   ├── state.ts    → cifrado/descifrado de state
│   ├── google.ts   → intercambio code↔tokens, validación ID Token
│   └── cookie.ts   → creación/validación de cookie de dominio
```

### Modificaciones en API principal (`faciliter.xyz`)

- Endpoint para validar sesión desde cookie (o el proxy setea un token JWT al redirect)
- El API necesita poder verificar sesiones creadas por el proxy

### Modificaciones en frontend (web admin)

- `LoginClient.tsx`: reemplazar Google Identity Services button por redirect a login proxy
- Actualizar `loginWithGoogle` en `web/lib/api/auth.ts`

### Sin cambios

- Mobile app: sigue usando `loginStaffGoogle` (id_token) → no afectado
- Email/password: no afectado
- Backend `loginStaffGoogle`: puede mantenerse como alternativa para APIs internas

## Alternativas consideradas

| Solución | Escala | Complejidad | Seguridad | Estado |
|----------|--------|-------------|-----------|--------|
| Origen por tenant | ❌ | Baja | Alta | Temporal |
| Iframe + postMessage | ✅ | Media | Media | No recomendada |
| **Redirect proxy** | ✅ | Media-Alta | Alta | Propuesta |
| Server-side OAuth inline | ✅ | Alta | Alta | Posible futuro |

## Manejo de errores y UX

### Errores

| Escenario | Qué pasa | Manejo |
|-----------|----------|--------|
| Usuario cancela Google | Google no redirige al callback | Redirigir a `return_to?error=auth_cancelled` con mensaje |
| State expiró | Callback con state viejo | Página de error: "Sesión expirada, intentá de nuevo" |
| State inválido | Posible ataque CSRF | Bloquear, loguear, no dar retry |
| Cookie bloqueada | Navegador rechaza cookie `.faciliter.xyz` | Fallback de último recurso: token de un solo uso en URL (`?token=xxx&use=1`), se elimina inmediatamente. Usar solo si cookie es bloqueada permanentemente (ej: Safari ITP estricto) |
| Timeout de red | Intercambio de code tarda demasiado | Retry 1 vez, luego error |
| `return_to` malicioso | Open redirect | Validar que `return_to` pertenece a `*.faciliter.xyz` o dominio de tenant registrado |
| Usuario presiona back | Vuelve al subdominio sin sesión | Detectar sesión inexistente, mostrar botón de login de nuevo |

### UX

- **Redirect visible**: el usuario ve que la URL cambia a `login.faciliter.xyz`. Mitigar con branding consistente (mismo logo, colores, título "Faciliter — Iniciar sesión").
- **Estado de carga**: mostrar spinner mientras se procesa el callback. La cookie puede tardar 1-2 segundos en estar disponible.
- **Mobile**: el redirect funciona igual pero puede haber problemas con Safari ITP (cookies de terceros). Si la cookie no llega, usar fallback de token en URL.
- **Persistencia de sesión**: si el usuario regresa después de cerrar el navegador, la cookie central persiste → sesión restaurada automáticamente en cualquier subdominio.

## Cuándo implementar

- [ ] Hay >10 tenants activos
- [ ] Agregar origins manual se vuelve un cuello de botella
- [ ] eCommerce con login de afiliado está en el roadmap cercano
- [ ] El login Google en admin web es crítico para el negocio

## Relación con otros docs

- [app-afiliado.md](./app-afiliado.md) — Identity/Login Corte B
- [admin.md](./admin.md) — Login admin web
- [99-backlog-post-mvp.md](../99-backlog-post-mvp.md) — Índice general
