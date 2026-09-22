# Implementación — Auth Proxy Google OAuth

**Estado:** Pendiente
**Estimación:** 2-3 días
**Prioridad:** Bloqueante para Google login en web admin (todos los tenants)

---

## Fase 1: Preparación

### 1.1 Google Cloud Console — Registrar login.faciliter.xyz

1. Abrir [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials)
2. Encontrar el client ID de tipo **"Aplicación web"** (el que ya existe)
3. Editar el client
4. En **"Orígenes autorizados"** agregar:
   ```
   https://login.faciliter.xyz
   ```
5. En **"URI de redirección"** agregar:
   ```
   https://login.faciliter.xyz/callback
   ```
6. Guardar

### 1.2 Obtener credenciales

Desde Google Cloud Console → Credentials:
- `CLIENT_ID`: el client ID del OAuth web
- `CLIENT_SECRET`: el secret (clic en "Editar" para revelar)

### 1.3 DNS

Crear registro A en el DNS de `faciliter.xyz`:
```
login.faciliter.xyz  →  A  →  <IP_DEL_VPS>
```

Verificar propagación:
```bash
nslookup login.faciliter.xyz
```

### 1.4 SSL

En el VPS:
```bash
apt install certbot
certbot certonly --standalone -d login.faciliter.xyz
```

Los certificados quedarán en `/etc/letsencrypt/live/login.faciliter.xyz/`.

---

## Fase 2: Backend — Auth Proxy

### 2.1 Crear estructura

```bash
mkdir -p auth-proxy/{routes,services,lib,docker}
cd auth-proxy
```

### 2.2 package.json

```json
{
  "name": "auth-proxy",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "start": "ts-node index.ts",
    "dev": "nodemon index.ts"
  },
  "dependencies": {
    "express": "^4.18.2",
    "google-auth-library": "^9.0.0",
    "googleapis": "^128.0.0",
    "dotenv": "^16.3.1",
    "uuid": "^9.0.0",
    "cors": "^2.8.5",
    "helmet": "^7.0.0"
  },
  "devDependencies": {
    "typescript": "^5.2.0",
    "ts-node": "^10.9.1",
    "nodemon": "^3.0.0",
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.13",
    "@types/uuid": "^9.0.0"
  }
}
```

### 2.3 tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "types": ["node"]
  },
  "include": ["**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

### 2.4 .env

```env
# Google OAuth
CLIENT_ID=382351831666-...apps.googleusercontent.com
CLIENT_SECRET=GOCSPX-...

# Proxy config
BASE_URL=https://login.faciliter.xyz
PORT=3003

# Return to validation (regex contra dominio)
RETURN_TO_ALLOWED_FQDNS=faciliter.xyz
```

### 2.5 index.ts

```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import 'dotenv/config';
import { startRouter } from './routes/start';
import { callbackRouter } from './routes/callback';
import { sessionValidateRouter } from './routes/session-validate';

const app = express();
const PORT = process.env.PORT || 3003;
const BASE_URL = process.env.BASE_URL || 'http://localhost:3003';

app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    const allowedDomains = (process.env.RETURN_TO_ALLOWED_FQDNS || '').split(',').map(d => d.trim()).filter(Boolean);
    const isAllowed = allowedDomains.some(domain => {
      if (domain === origin) return true;
      if (domain.startsWith('*.')) {
        const suffix = domain.slice(1);
        return origin === suffix || origin.endsWith('.' + suffix);
      }
      return false;
    });
    callback(null, isAllowed);
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'auth-proxy' });
});

app.use('/start', startRouter);
app.use('/callback', callbackRouter);
app.use('/session/verify', sessionVerifyRouter);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Auth proxy running on port ${PORT}`);
});
```

### 2.6 routes/start.ts

```typescript
import { Router, Request, Response } from 'express';
import { generateState } from '../services/state';
import { validateReturnTo } from '../lib/return-to';

const router = Router();

router.get('/start', (req: Request, res: Response) => {
  const returnTo = req.query.return_to as string || '';

  // Validar que return_to pertenece a un dominio permitido
  if (!validateReturnTo(returnTo)) {
    return res.status(400).send('Invalid return_to');
  }

  // Generar state cifrado (contiene return_to + timestamp)
  const state = generateState(returnTo);

  // Construir URL de autorización de Google
  const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  googleAuthUrl.searchParams.set('client_id', process.env.CLIENT_ID!);
  googleAuthUrl.searchParams.set('redirect_uri', `${process.env.BASE_URL}/callback`);
  googleAuthUrl.searchParams.set('response_type', 'code');
  googleAuthUrl.searchParams.set('scope', 'openid email profile');
  googleAuthUrl.searchParams.set('state', state);
  googleAuthUrl.searchParams.set('access_type', 'offline');
  googleAuthUrl.searchParams.set('prompt', 'consent');

  // Redirigar al usuario a Google
  res.redirect(302, googleAuthUrl.toString());
});

export const startRouter = router;
```

### 2.7 routes/callback.ts

```typescript
import { Router, Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { v4 as uuidv4 } from 'uuid';
import { verifyState, extractReturnTo } from '../services/state';
import { exchangeCode } from '../services/google';
import { createSession, setSessionCookie } from '../services/session';
import { validateReturnTo } from '../lib/return-to';

const router = Router();

router.get('/callback', async (req: Request, res: Response) => {
  const { code, state } = req.query;

  // 1. Verificar state
  let returnTo: string;
  try {
    if (!state || typeof state !== 'string') {
      throw new Error('Missing state');
    }
    returnTo = extractReturnTo(state);
    verifyState(state);
  } catch (err) {
    console.error('State verification failed:', err);
    return res.status(400).send('Invalid or expired session. Try again.');
  }

  // 2. Validar return_to (defense in depth)
  if (!validateReturnTo(returnTo)) {
    return res.status(400).send('Invalid return_to');
  }

  try {
    // 3. Intercambiar code por tokens
    const tokenResponse = await exchangeCode(code as string);

    // 4. Validar ID Token
    const oauth2Client = new OAuth2Client(process.env.CLIENT_ID);
    const ticket = await oauth2Client.verifyIdToken({
      idToken: tokenResponse.id_token,
      audience: process.env.CLIENT_ID,
    });
    const payload = ticket.getPayload();

    if (!payload || !payload.email || !payload.sub) {
      throw new Error('Invalid ID token payload');
    }

    // 5. Buscar/crear identidad en la base de datos
    //    (Implementar según el modelo de datos de la app)
    const identity = await findOrCreateIdentity({
      googleSub: payload.sub,
      email: payload.email,
      name: payload.name || null,
    });

    // 6. Crear sesión central
    const sessionId = uuidv4();
    await createSession(sessionId, identity.id, identity.email);

    // 7. Setear cookie .faciliter.xyz
    setSessionCookie(res, sessionId);

    // 8. Redirigir al return_to
    res.redirect(302, returnTo);
  } catch (err) {
    console.error('Callback error:', err);
    const errorUrl = new URL(returnTo);
    errorUrl.searchParams.set('error', 'auth_failed');
    res.redirect(302, errorUrl.toString());
  }
});

async function findOrCreateIdentity(googleSub: string, email: string, name: string | null) {
  // TODO: Implementar según el modelo de datos
  // Buscar por google_sub, si no existe crear identity + identidad vinculada
  throw new Error('findOrCreateIdentity not implemented');
}

export const callbackRouter = router;
```

### 2.8 routes/session-validate.ts

```typescript
import { Router, Request, Response } from 'express';
import { getSession } from '../services/session';

const router = Router();

router.post('/validate', (_req: Request, res: Response) => {
  const { sessionId } = req.body;

  if (!sessionId || typeof sessionId !== 'string') {
    return res.status(401).json({ error: 'sessionId required' });
  }

  const session = getSession(sessionId);
  if (!session) {
    return res.status(401).json({ error: 'Session not found' });
  }

  res.json({
    email: session.email,
    name: session.name,
    googleSub: session.googleSub,
  });
});

export const sessionValidateRouter = router;
```

### 2.9 lib/return-to.ts

```typescript
export function validateReturnTo(returnTo: string): boolean {
  if (!returnTo || typeof returnTo !== 'string') {
    return false;
  }

  try {
    const url = new URL(returnTo);
    const hostname = url.hostname;
    const allowedDomains = (process.env.RETURN_TO_ALLOWED_FQDNS || '').split(',').map(d => d.trim());

    // Solo HTTPS
    if (url.protocol !== 'https:') {
      return false;
    }

    // Verificar que el hostname pertenece a un dominio permitido
    return allowedDomains.some(domain => {
      if (domain.startsWith('*.')) {
        const suffix = domain.slice(1);
        return hostname === suffix || hostname.endsWith('.' + suffix);
      }
      return hostname === domain;
    });
  } catch {
    return false;
  }
}
```

### 2.10 services/state.ts

```typescript
import crypto from 'crypto';

const STATE_TTL_MS = 120_000; // 2 min

const stateStore = new Map<string, { returnTo: string; expiresAt: number }>();

export function generateState(returnTo: string): string {
  const raw = `${returnTo}:${Date.now()}:${crypto.randomBytes(32).toString('hex')}`;
  const state = crypto.createHash('sha256').update(raw).digest('hex');
  stateStore.set(state, { returnTo, expiresAt: Date.now() + STATE_TTL_MS });
  return state;
}

export function verifyState(state: string): { valid: boolean; returnTo: string } {
  const entry = stateStore.get(state);
  if (!entry) return { valid: false, returnTo: '' };
  if (Date.now() > entry.expiresAt) {
    stateStore.delete(state);
    return { valid: false, returnTo: '' };
  }
  stateStore.delete(state);
  return { valid: true, returnTo: entry.returnTo };
}
```

### 2.11 services/google.ts

```typescript
import { OAuth2Client } from 'google-auth-library';

const oAuth2Client = new OAuth2Client(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  `${process.env.BASE_URL}/callback`
);

export async function exchangeCode(code: string) {
  const { tokens } = await oAuth2Client.getToken(code);
  return tokens;
}

export async function verifyIdToken(idToken: string) {
  const ticket = await oAuth2Client.verifyIdToken({
    idToken,
    audience: process.env.CLIENT_ID,
  });
  return ticket.getPayload();
}
```

### 2.12 services/session.ts

```typescript
import crypto from 'crypto';

// Sesiones en memoria (upgrade a Redis/DB en producción)
const sessions = new Map<string, {
  id: string;
  userId: string;
  email: string;
  name: string | null;
  googleSub: string;
  consumed: boolean;
  createdAt: number;
}>();

const SESSION_TTL = 15 * 60 * 1000; // 15 minutos

export async function createSession(
  sessionId: string,
  userId: string,
  email: string,
  name?: string | null,
  googleSub?: string,
): Promise<void> {
  sessions.set(sessionId, {
    id: sessionId,
    userId,
    email,
    name: name || null,
    googleSub: googleSub || '',
    consumed: false,
    createdAt: Date.now(),
  });

  // TTL cleanup
  setTimeout(() => {
    sessions.delete(sessionId);
  }, SESSION_TTL);
}

export async function verifySession(sessionId: string) {
  const session = sessions.get(sessionId);
  if (!session || session.consumed || Date.now() - session.createdAt > SESSION_TTL) {
    return null;
  }
  return session;
}

export async function markSessionConsumed(sessionId: string): Promise<void> {
  const session = sessions.get(sessionId);
  if (session) {
    session.consumed = true;
  }
}
```

### 2.13 lib/cookie.ts

```typescript
import { Response } from 'express';

export function setSessionCookie(res: Response, sessionId: string): void {
  res.setHeader('Set-Cookie', [
    `central_session=${sessionId}; Domain=.faciliter.xyz; Path=/; Secure; HttpOnly; SameSite=None; Max-Age=900`,
  ]);
}
```

### 2.14 Dockerfile

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
CMD ["node", "dist/index.js"]
```

---

## Fase 3: Frontend

### 3.1 LoginClient.tsx — Cambios principales

**Eliminar:**
```typescript
// ELIMINAR TODO ESTO:
const googleBtnRef = useRef<HTMLDivElement>(null);
const googleInitRef = useRef(false);

useEffect(() => {
  if (!tenant || tenantError || googleInitRef.current) return;
  const script = document.createElement('script');
  script.src = 'https://accounts.google.com/gsi/client';
  script.async = true;
  script.onload = () => {
    window.google.accounts.id.initialize({...});
    window.google.accounts.id.renderButton(...);
    window.google.accounts.id.prompt();
  };
  document.body.appendChild(script);
  googleInitRef.current = true;
}, [tenant, tenantError, loginWithGoogle, router]);
```

**Agregar:**
```typescript
function handleGoogleLogin(): void {
  const returnTo = window.location.href;
  window.location.href = `https://login.faciliter.xyz/start?return_to=${encodeURIComponent(returnTo)}`;
}
```

**En el JSX, cambiar:**
```jsx
// ANTES:
<div ref={googleBtnRef} style={{ marginTop: '12px' }} />

// DESPUÉS:
<button
  type="button"
  className="btn"
  onClick={handleGoogleLogin}
  style={{ marginTop: '12px' }}
>
  Continuar con Google
</button>
```

### 3.2 web/lib/api/auth.ts

**NO modificar.** `staffGoogleLogin` se mantiene para mobile. El web admin usa redirect al proxy.

---

## Fase 4: Docker Compose

### Agregar a docker-compose.yml:

```yaml
  auth-proxy:
    build:
      context: ./auth-proxy
      dockerfile: Dockerfile
    container_name: faciliter-auth-proxy
    restart: unless-stopped
    env_file:
      - ./auth-proxy/.env
    ports:
      - "3003:3003"
    depends_on:
      api:
        condition: service_healthy
    healthcheck:
      test:
        [
          "CMD-SHELL",
          "node -e \"fetch('http://127.0.0.1:3003/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))\"",
        ]
      interval: 10s
      timeout: 5s
      retries: 10
      start_period: 15s
```

---

## Fase 5: Despliegue en VPS

### Pasos:

```bash
# 1. Ir al repo
cd /opt/faciliter

# 2. Pull de código
git pull origin main

# 3. Configurar .env del auth-proxy
cp auth-proxy/.env.example auth-proxy/.env
# Editar auth-proxy/.env con CLIENT_ID, CLIENT_SECRET

# 4. Build y subir auth-proxy
docker compose build auth-proxy
docker compose up -d auth-proxy

# 5. Verificar que está corriendo
docker compose ps auth-proxy
curl https://login.faciliter.xyz/

# 6. Rebuild web (si se modificó LoginClient.tsx)
docker compose up -d --build web

# 7. Test completo
# Abrir https://gym-de-prueba.faciliter.xyz
# Hacer clic en "Continuar con Google"
# Verificar: redirige a login.faciliter.xyz → Google → callback → cookie → dashboard
```

---

## Fase 6: Verificación

| # | Test | Resultado esperado |
|---|------|---------------------|
| 6.1 | `curl https://login.faciliter.xyz/` | `{"status":"ok","service":"auth-proxy"}` |
| 6.2 | `curl -v https://login.faciliter.xyz/start?return_to=https://faciliter.xyz` | 302 redirect a Google OAuth URL |
| 6.3 | Login completo con Google | Cookie `.faciliter.xyz` seteada, redirigido al tenant |
| 6.4 | Otro tenant `https://otro-gym.faciliter.xyz` | Login funciona sin agregar origin |
| 6.5 | `/session/validate` sin cookie | 401 |
| 6.6 | `/session/validate` con cookie | 200 con identidad |
| 6.7 | `/session/validate` con sessionId inválido | 401 |
| 6.8 | `/start` con return_to malicioso | 400 |
| 6.9 | `/callback` con state expirado | Error, no login |

---

## Relación con otros docs

- [19-google-oauth-escalado.md](../99-backlog-post-mvp/19-google-oauth-escalado.md) — Documentación técnica completa
- [app-afiliado.md](../99-backlog-post-mvp/app-afiliado.md) — Identity/Login Corte B
- [admin.md](../99-backlog-post-mvp/admin.md) — Login admin web

---

## Escalabilidad: Redis

Las sesiones actualmente viven en memoria del proceso. Para producción multi-instancia:

1. Reemplazar `Map` por Redis client (`ioredis` o `@nestjs/cache-manager` + redis)
2. Mismo TTL (15 min) y misma lógica de cleanup
3. Rate limiting también en Redis (contadores compartidos)
4. `proxySessions` Map en API → cache Redis (userId → sessionId)
5. Cookie `central_session` no cambia (HttpOnly, Secure, SameSite=Lax)

**No requiere migración de datos ni cambio de esquema.**
