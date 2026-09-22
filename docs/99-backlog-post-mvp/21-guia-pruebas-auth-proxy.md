# Guía de Pruebas — Auth Proxy (Google OAuth proxy)

## 0. Requisitos previos

- [ ] VPS con Docker Compose actualizado (incluye `auth-proxy` en `docker-compose.yml`)
- [ ] `AUTH_PROXY_URL=http://auth-proxy:3003` en `.env` de API (Docker)
- [ ] En VPS: `AUTH_PROXY_URL=https://login.faciliter.xyz` en `.env` de API
- [ ] Google Cloud Console tiene:
  - Client ID tipo Web configurado
  - URI de redirect autorizada: `https://login.faciliter.xyz/auth/callback`
  - Origen autorizado: `https://login.faciliter.xyz`
- [ ] `.env` de auth-proxy tiene `CLIENT_ID`, `CLIENT_SECRET` con valores reales
- [ ] DNS `login.faciliter.xyz` → VPS (con SSL)

## 1. Smoke test — infraestructura

```bash
# Auth proxy responde
curl https://login.faciliter.xyz/
# → { "status": "ok", "service": "auth-proxy" }

# API responde
curl https://api.faciliter.xyz/api/health
# → { "status": "ok" }
```

En Docker Compose principal:

```bash
cd /opt/gymbro
docker compose ps auth-proxy api web
docker compose logs auth-proxy --tail 20
```

## 2. Flujo completo — Login con Google

### 2a. Abrir login del gym

1. Abrir `https://demo.faciliter.xyz/login` en navegador (sesión expirada o sin sesión)
2. **Esperado:** Se ve formulario de email/password + botón "Continuar con Google"
3. NO se ve widget de Google Identity Services (solo botón HTML)

### 2b. Redirigir al proxy

1. Clic en "Continuar con Google"
2. **Esperado:** Redirige a `https://login.faciliter.xyz/start?return_to=https%3A%2F%2Fdemo.faciliter.xyz%2Flogin`
3. **Esperado:** La URL tiene `return_to` correctamente codificado
4. **Esperado:** Página de consentimiento de Google

### 2c. Autenticar con Google

1. Seleccionar cuenta de Google
2. Aprobar permisos (email, profile)
3. **Esperado:** Redirige de vuelta a `https://demo.faciliter.xyz/login` (o el return_to original)
4. **Esperado:** Cookie `central_session` está presente (verificar en DevTools → Application → Cookies)
   - Dominio: `.faciliter.xyz`
   - HttpOnly ✓, Secure ✓, SameSite=Lax ✓

### 2d. Auto-login

1. Después del redirect, la página debería auto-login
2. **Esperado:** URL cambia a `https://demo.faciliter.xyz/` (dashboard del gym)
3. **Esperado:** No se ve formulario de login (ya hay sesión)
4. Verificar en DevTools → Network:
   - Petición `POST /api/auth/from-cookie` con respuesta 200 y JWT
   - Cookie `central_session` enviada automáticamente

## 3. Verificación con curl

### 3a. Simular sin cookie (debería fallar)

```bash
curl -X POST https://api.faciliter.xyz/api/auth/from-cookie \
  -H "Content-Type: application/json" \
  -H "Cookie: central_session=";
# → 401 Unauthorized
```

### 3b. Verificar que JWT funciona

```bash
# Primero obtener cookie (manual, paso 2c)
# Luego:
curl -X POST https://api.faciliter.xyz/api/auth/from-cookie \
  -H "Content-Type: application/json" \
  -b "central_session=<SESSION_ID>" \
  -c cookies.txt
# → 200 { accessToken, refreshToken, ... }

# Usar el JWT:
curl https://api.faciliter.xyz/api/auth/me \
  -H "Authorization: Bearer <accessToken>"
# → 200 { userId, email, ... }
```

### 3c. Probar `/start` del proxy

```bash
curl -v "https://login.faciliter.xyz/start?return_to=https://demo.faciliter.xyz"
# → 302 redirect a Google OAuth URL
# Verificar redirect_uri en la URL de Google: debe ser https://login.faciliter.xyz/auth/callback
```

## 4. Casos de error

### 4a. return_to no autorizado

```bash
curl -v "https://login.faciliter.xyz/start?return_to=https://evil.com"
# → 400 "Invalid return_to"
```

### 4b. State inválido o expirado

1. Abrir `/start`, copiar el `state` de la URL
2. Esperar 3 minutos
3. Completar el login
4. **Esperado:** "Invalid or expired session" (el state expiró)

### 4c. Cookie expirada

1. Logearse con Google
2. Esperar 15 minutos (TTL de sesión)
3. Recargar página
4. **Esperado:** Redirige a `/login` (cookie ya no es válida)

### 4d. Sin cookie en from-cookie

1. Abrir login en navegador limpio (sin cookies)
2. Clic en "Continuar con Google"
3. Completar login
4. **Esperado:** Auto-login funciona (cookie se establece en callback)

## 5. Flujo de logout

1. En dashboard, abrir menú de usuario
2. Clic en "Cerrar sesión"
3. **Esperado:**
   - `POST /api/auth/logout` → 200
   - localStorage limpio
   - Cookie `central_session` debería limpiarse (el proxy necesita endpoint de logout — ver pendientes)
   - Redirect a `/login`

## 6. Regresiones

### 6a. Login con email/password sigue funcionando

1. Abrir `https://demo.faciliter.xyz/login`
2. Completar formulario con email/password
3. **Esperado:** Login exitoso, redirect a `/`

### 6b. Super Admin login sigue funcionando

1. Abrir `https://faciliter.xyz/super/login`
2. Completar credenciales
3. **Esperado:** Login exitoso

### 6c. hasPassword UI

1. Login con usuario que tiene password
2. En `/cuenta`, botón "Cambiar contraseña" HABILITADO
3. Login con usuario Google-only (hasPassword=false)
4. En `/cuenta`, botón "Cambiar contraseña" DESHABILITADO con tooltip

## 7. Verificación en VPS después de deploy

```bash
# Verificar que todos los servicios están sanos
cd /opt/gymbro
docker compose ps
docker compose logs auth-proxy --tail 5
docker compose logs api --tail 5
docker compose logs web --tail 5
```

## 8. Checklist post-deploy

- [ ] `login.faciliter.xyz` responde con SSL válido
- [ ] `https://login.faciliter.xyz/` → `{ status: ok }`
- [ ] `https://login.faciliter.xyz/start?return_to=https://demo.faciliter.xyz` → redirect a Google
- [ ] Login Google completo funciona (2a → 2d)
- [ ] Login email/password funciona (regresión 6a)
- [ ] Auto-logout limpia sesión
- [ ] Sin cookie → 401 en `/api/auth/from-cookie`
- [ ] `hasPassword` UI correcta en `/cuenta`
